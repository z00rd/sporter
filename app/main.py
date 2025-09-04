from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from .api.activities import router as activities_router
from .api.users import router as users_router
from .api.auth import router as auth_router
from .api.admin import router as admin_router

app = FastAPI(title="Sporter", description="GPX Training Analysis Platform")

# Add Session middleware (required for OAuth)
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-change-in-production")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(activities_router)
app.include_router(users_router)

# Serve static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    with open("app/templates/index.html", "r") as f:
        return HTMLResponse(content=f.read())

@app.get("/health")
async def health():
    return {"status": "healthy"}