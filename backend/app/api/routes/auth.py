"""API Routes — Auth (Stub — Replace with Supabase/NextAuth)"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from uuid import uuid4

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str


@router.post("/register")
async def register(req: RegisterRequest):
    # Stub: In production, use Supabase Auth or Clerk
    return {
        "token": f"stub_token_{uuid4()}",
        "user": {"id": str(uuid4()), "username": req.username, "email": req.email},
    }


@router.post("/login")
async def login(req: LoginRequest):
    return {
        "token": f"stub_token_{uuid4()}",
        "user": {"id": str(uuid4()), "username": req.email.split("@")[0], "email": req.email},
    }


@router.get("/me")
async def me():
    return {"user": None}
