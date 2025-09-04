# Sporter - Setup Guide

## 🚀 Quick Start na nowym komputerze

### Wymagania
- Docker Desktop
- Git
- Claude CLI (opcjonalnie)

### Setup Krok po Kroku

#### 1. Clone projektu
```bash
git clone https://github.com/z00rd/sporter.git
cd sporter
git checkout feature/oauth-system-complete
```

#### 2. Konfiguracja środowiska
```bash
# Skopiuj template zmiennych środowiskowych
cp .env.example .env

# Edytuj .env z prawdziwymi wartościami:
# - GOOGLE_CLIENT_ID=your-real-client-id
# - GOOGLE_CLIENT_SECRET=your-real-client-secret
```

#### 3. Uruchomienie aplikacji
```bash
# WAŻNE: Użyj profilu 'api'
docker-compose --profile api up -d

# Zainstaluj dependencies (potrzebne przy pierwszym uruchomieniu)
docker-compose --profile api exec api pip install 'python-jose[cryptography]' authlib python-magic httpx itsdangerous

# Uruchom migracje bazy danych
docker-compose --profile api exec api alembic upgrade head
```

#### 4. Weryfikacja
```bash
# Test API
curl http://localhost:8000/health
# Oczekiwany wynik: {"status":"healthy"}

# Test OAuth redirect
curl -I http://localhost:8000/api/v1/auth/google
# Oczekiwany wynik: 302 redirect do Google
```

#### 5. Pierwsza konfiguracja
```bash
# Ustaw pierwszego użytkownika jako admin
docker-compose --profile api exec postgres psql -U dev -d sporter -c "UPDATE users SET is_approved = true WHERE id = 1;"
```

### Dostępne endpointy

- **Health:** http://localhost:8000/health
- **Dokumentacja API:** http://localhost:8000/docs  
- **Frontend:** http://localhost:8000/
- **OAuth login:** http://localhost:8000/api/v1/auth/google

### Troubleshooting

#### Problem: API nie odpowiada
```bash
# Sprawdź logi
docker-compose logs api --tail=20

# Restart z profilem
docker-compose --profile api restart api
```

#### Problem: Brakuje dependencies
```bash
# Zainstaluj ponownie
docker-compose --profile api exec api pip install 'python-jose[cryptography]' authlib python-magic httpx itsdangerous
```

#### Problem: Błędy bazy danych
```bash
# Uruchom migracje
docker-compose --profile api exec api alembic upgrade head

# Sprawdź połączenie z bazą
docker-compose --profile api exec postgres pg_isready -U dev -d sporter
```

### Google OAuth Setup

1. Idź do [Google Cloud Console](https://console.cloud.google.com)
2. Utwórz nowy projekt lub wybierz istniejący
3. Włącz Google+ API
4. Utwórz OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/api/v1/auth/google/callback`
5. Skopiuj Client ID i Client Secret do `.env`

### Development Commands

```bash
# Uruchomienie z profilem api
docker-compose --profile api up -d

# Restart całego stack
docker-compose --profile api down && docker-compose --profile api up -d

# Generowanie nowej migracji
docker-compose --profile api exec api alembic revision --autogenerate -m "Description"

# Aplikowanie migracji
docker-compose --profile api exec api alembic upgrade head

# Dostęp do bazy danych
docker-compose --profile api exec postgres psql -U dev -d sporter
```

### Architektura Systemu

**Backend:**
- FastAPI z async/await
- PostgreSQL z PostGIS (GIS data)
- Redis (sessions, cache)
- Alembic (migracje)

**OAuth Flow:**
1. `GET /api/v1/auth/google` → redirect do Google
2. Google callback → `GET /api/v1/auth/google/callback`
3. JWT token generation → redirect do frontend
4. Frontend checks approval status
5. Admin approves via `POST /api/v1/admin/approve-user`

**Security Features:**
- Google OAuth only authentication
- JWT tokens with expiration
- Admin approval required for new users  
- Secure file uploads with content validation
- Path traversal protection
- Session-based OAuth state management

### Production Checklist

- [ ] Prawdziwe Google OAuth credentials
- [ ] HTTPS/SSL enforcement
- [ ] Rate limiting middleware  
- [ ] Environment variables dla production
- [ ] Database connection pooling
- [ ] Error monitoring
- [ ] Backup strategy