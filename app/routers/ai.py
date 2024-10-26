from typing import List
from fastapi import APIRouter, UploadFile, Depends
from pydantic import BaseModel
from app.utils.AIService import AIService  # Assuming AIService is defined in app.utils

# Initialize the AIService instance
ai_service = AIService(project_id="scientific-elf-437313-q7", region="us-central1")

router = APIRouter()


class QuestionRequest(BaseModel):
    question: str


@router.post("/files")
def file_contents(files: List[UploadFile]):
    return {"filenames": [file.filename for file in files]}


@router.post("/upload")
async def upload(files: List[UploadFile]):
    docs = await ai_service.upload_documents(files)
    summaries = ai_service.create_summaries(docs)
    return ai_service.store_docs(summaries, docs)


@router.post("/answer")
async def answer_question(request: QuestionRequest):
    # Generate an answer based on retrieved documents
    answer = ai_service.generate_answer(request.question)
    return {"answer": answer}
