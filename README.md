# Smart Legal Assistance and Lawyer Recommendation System

This is a comprehensive, production-ready Final Year Engineering Project leveraging AI for legal clause analysis and lawyer recommendations.

## Technology Stack
- **Frontend**: React.js (Vite), TailwindCSS, Material UI, Redux Toolkit
- **Backend**: Java Spring Boot, Hibernate, Spring Security (JWT)
- **AI Microservice**: Python FastAPI, Sentence-BERT, NLP heuristics
- **Database**: MySQL 8.0
- **Infrastructure**: Docker & Docker Compose

## Features
- **Role-based Auth**: Secure login/registration for Users and Lawyers.
- **AI Document Analysis**: Upload legal documents (PDF/DOCX) for risk clause analysis.
- **Lawyer Search**: AI-powered recommendation system to match users with lawyers.
- **Dynamic Dashboards**: Premium glassmorphism UI with real-time responsive elements.

## Quick Start (Docker)
Ensure you have Docker and Docker Compose installed.

1. Clone or download the repository.
2. Run the following command from the root directory:
   ```bash
   docker-compose up --build
   ```
3. The services will be available at:
   - **Frontend UI**: http://localhost:3000
   - **Backend API**: http://localhost:8080
   - **Backend Swagger UI**: http://localhost:8080/swagger-ui.html
   - **AI Microservice API**: http://localhost:8000
   - **AI Swagger UI**: http://localhost:8000/docs

## API Postman Collection
Please refer to the `docs/` folder for API documentation and Postman collections.

## Author
Developed for Final Year Engineering Project.
