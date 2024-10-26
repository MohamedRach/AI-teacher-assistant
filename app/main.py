# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ai
import sys, os

sys.path.append(os.path.abspath(".."))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(ai.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI application!"}
