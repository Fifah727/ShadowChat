from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Message":"Hello, FastAPI is working!"}