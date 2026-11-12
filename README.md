# SFRS · Admin Dashboard (Next.js)

The admin dashboard for the Student Face Recognition System. It covers enrolling students with a webcam, a live face scanner, and the attendance log.
The API lives in [sfrs-backend](https://github.com/chiragluhach-droid/sfrs-backend).

## Run locally

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                    # http://localhost:3000
```

## Deploy on Vercel

1. Deploy the backend first and copy its URL.
2. On Vercel, choose **Add New → Project** and import this repo. The framework is detected as Next.js automatically.
3. Add the environment variable `NEXT_PUBLIC_API_URL` = `https://<your-backend>.onrender.com`.
4. Deploy, then set the backend's `CORS_ORIGINS` to the resulting `https://….vercel.app` URL.

The webcam needs HTTPS, which Vercel provides.

## Pages

`/` overview · `/students` directory · `/students/[id]` profile · `/enroll` enrollment · `/scan` live scanner · `/logs` attendance log · `/login` admin sign-in
