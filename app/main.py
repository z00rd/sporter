from fastapi import FastAPI

app = FastAPI(title="Sporter", description="GPX Training Analysis Platform")

@app.get("/")
async def root():
    return {"message": "Sporter API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}