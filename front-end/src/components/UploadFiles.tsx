import { useState } from "react";
import { useMutation } from "react-query";
import axios from "axios";
import { Input } from "./ui/input";

export default function UploadFile() {
  const [files, setFiles] = useState<File[]>([]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  // Define the mutation for uploading files
  const uploadMutation = useMutation(async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await axios.post(
      "http://localhost:8080/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    uploadMutation.mutate(files);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Please upload your documents below
        </h1>
        <form onSubmit={handleSubmit}>
          <Input
            id="files"
            onChange={handleValueChange}
            type="file"
            multiple
            className="block w-full text-gray-700 border rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <button
            type="submit"
            className="mt-4 bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Submit
          </button>
        </form>
        {uploadMutation.isLoading && <p>Uploading files...</p>}
        {uploadMutation.isSuccess && <p>Files uploaded successfully!</p>}
        {uploadMutation.isError && (
          <p className="text-red-500">Error uploading files.</p>
        )}
        {files && (
          <div className="mt-4">
            {files.map((file) => (
              <p key={file.name} className="text-gray-700">
                {file.name}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
