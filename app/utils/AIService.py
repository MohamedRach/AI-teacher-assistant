from typing import List
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_vertexai import ChatVertexAI, VertexAI, VertexAIEmbeddings
from langchain.storage import InMemoryByteStore
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain.retrievers.multi_vector import MultiVectorRetriever
import uuid
from tempfile import NamedTemporaryFile
import os
from operator import itemgetter


class AIService:
    def __init__(self, project_id: str, region: str):
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
        os.environ["LANGCHAIN_API_KEY"] = "your api key here"
        os.environ["GOOGLE_API_KEY"] = "your api key here"

        self.project_id = project_id
        self.region = region
        self._initialize_vertex_ai()
        self.retriever = self._initialize_retriever()

    def _initialize_vertex_ai(self):
        import vertexai

        vertexai.init(project=self.project_id, location=self.region)

    def _initialize_retriever(self) -> MultiVectorRetriever:
        vectorstore = Chroma(
            collection_name="summaries",
            embedding_function=VertexAIEmbeddings(model_name="text-embedding-004"),
        )
        store = InMemoryByteStore()
        return MultiVectorRetriever(
            vectorstore=vectorstore, byte_store=store, id_key="doc_id"
        )

    async def upload_documents(self, files: List[UploadFile]) -> List[Document]:
        docs = []
        for i, file in enumerate(files):
            with NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file.write(await file.read())
                temp_file.flush()
                temp_file_path = temp_file.name
            loader = PyPDFLoader(temp_file_path)
            docs.extend(loader.load() if i > 0 else loader.load())
            os.remove(temp_file_path)
        return docs

    def create_summaries(self, docs: List[Document]) -> List[str]:
        chain = (
            {"doc": lambda x: x.page_content}
            | ChatPromptTemplate.from_template(
                "Summarize the following document:\n\n{doc}"
            )
            | ChatVertexAI(model="gemini-pro-vision", max_retries=0)
            | StrOutputParser()
        )
        summaries = chain.batch(docs, {"max_concurrency": 5})
        return summaries

    def store_docs(self, summaries: List[str], docs: List[Document]) -> str:
        doc_ids = [str(uuid.uuid4()) for _ in docs]
        summary_docs = [
            Document(page_content=s, metadata={"doc_id": doc_ids[i]})
            for i, s in enumerate(summaries)
        ]
        self.retriever.vectorstore.add_documents(summary_docs)
        self.retriever.docstore.mset(list(zip(doc_ids, docs)))
        return "Documents stored successfully"

    def format_docs(self, docs):
        return docs[0].page_content if docs else ""

    def generate_answer(self, question: str):
        retrieved_docs = self.retriever.get_relevant_documents(question, n_results=1)
        print(len(retrieved_docs))
        template = """Answer the following question based on this context:

        {context}

        Question: {question}
        """
        prompt = ChatPromptTemplate.from_template(template)
        llm = VertexAI(model_name="gemini-pro-vision")
        final_rag_chain = (
            {
                "context": lambda x: self.format_docs(retrieved_docs),
                "question": itemgetter("question"),
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        return final_rag_chain.invoke({"question": question})
