# TODO - Sporter Development Plan

## Aktualne osiągnięcia ✅
- [x] Database schema (PostgreSQL + PostGIS)
- [x] Alembic migrations setup
- [x] GPX parser with outlier detection
- [x] CLI import tool (docker network approach)
- [x] HR outlier detection (startup period + statistical)
- [x] PostGIS spatial indexes for trackpoints

## Najbliższe kroki (Priority High)

### 1. API Development
- [ ] **FastAPI endpoints dla GPX upload**
  - POST `/api/v1/activities/import` (multipart file upload)
  - GET `/api/v1/activities` (lista aktywności)
  - GET `/api/v1/activities/{id}` (szczegóły + trackpoints)
  - Service layer wrappujący existing GPX parser logic

### 2. Authentication & Users
- [ ] **User model i authentication**
  - User table (id, email, password_hash, created_at)
  - JWT token authentication
  - Activity ownership (activity.user_id foreign key)
  - Registration/login endpoints

### 3. Frontend Foundation
- [ ] **Basic web interface**
  - React/Next.js setup
  - GPX file drag & drop upload
  - Activity list view
  - Basic activity details page

## Średnioterminowe (Priority Medium)

### 4. Data Visualization
- [ ] **Activity visualization**
  - Route map (Leaflet/MapBox integration)
  - Elevation profile chart
  - Heart rate over time chart
  - Pace analysis chart
  - Outlier points highlighting (red markers)

### 5. Advanced GPX Processing
- [ ] **Enhanced analysis features**
  - Automatic activity type detection (running/cycling/hiking)
  - Pace zones analysis
  - Heart rate zones (based on user max_hr)
  - Elevation gain/loss calculation improvements
  - Moving time vs total time detection

### 6. Interactive Outlier Management
- [ ] **Manual outlier adjustment**
  - Frontend interface do włączania/wyłączania outlierów
  - Batch operations (exclude first X minutes)
  - Custom exclusion reasons
  - Automatic metric recalculation after changes

## Długoterminowe (Priority Low)

### 7. Advanced Analytics
- [ ] **Comparative analysis**
  - Activity comparisons (same routes)
  - Performance trends over time
  - Personal records tracking
  - Weekly/monthly statistics

### 8. Social & Sharing
- [ ] **Sharing capabilities**
  - Public activity links
  - Activity export (GPX, TCX, PDF reports)
  - Basic social features (following other users)

### 9. Mobile Support
- [ ] **Mobile optimization**
  - Responsive design
  - Mobile app (React Native?)
  - GPS tracking integration

### 10. Production Deployment
- [ ] **GCP deployment setup**
  - Docker containers for production
  - Cloud SQL (PostgreSQL + PostGIS)
  - Cloud Storage dla GPX files
  - CI/CD pipeline
  - Monitoring i logging

## Technical Debt & Improvements

### Code Quality
- [ ] **Testing suite**
  - Unit tests for GPX parser
  - Integration tests for API endpoints
  - Database tests with fixtures
  - End-to-end tests for import flow

### Performance
- [ ] **Database optimizations**
  - Query optimization dla large datasets
  - Trackpoint pagination
  - Analytics caching improvements
  - Background processing dla heavy calculations

### Developer Experience
- [ ] **Development workflow**
  - Docker-compose profile for full stack
  - Database seeding scripts
  - API documentation improvements
  - Better error handling & logging

## Architecture Decisions Needed

### File Storage
- **Local files vs Cloud Storage** - gdzie przechowywać uploaded GPX?
- **Processing pipeline** - sync vs async processing for large files?

### Database Design
- **User data separation** - single tenant vs multi-tenant approach?
- **Archive strategy** - jak handle large historical datasets?

### Frontend Architecture
- **State management** - Redux/Zustand for complex state?
- **Real-time features** - WebSocket dla live processing updates?

## Notes & Considerations

**GPX Parser Improvements:**
- Support dla różnych GPX extensions (Strava, Garmin, Polar)
- Better handling corrupt/incomplete files
- Batch import multiple files
- GPX file validation

**Security:**
- File upload security (scan dla malicious content)
- Rate limiting dla API endpoints
- User data privacy considerations

**Scalability:**
- Database sharding strategy
- CDN dla static assets
- Background job processing (Celery/Redis Queue)

**Monitoring:**
- Application performance monitoring
- Database query performance
- User activity analytics
- Error tracking & alerting