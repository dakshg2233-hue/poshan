# Poshan Production Deployment Guide

**Status**: ✅ Ready for Production Deployment  
**Built**: August 22, 2026  
**Version**: 0.1.0

---

## 🚀 Quick Start

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy --prod

# Set environment variables in Vercel dashboard
```

### Option 2: Docker
```bash
# Build image
docker build -t poshan:latest .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e RESEND_API_KEY=your-key \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  poshan:latest
```

### Option 3: Docker Compose
```bash
# Create .env file with production values
cp .env.example .env

# Deploy
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 📋 Pre-Deployment Checklist

### Required Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key (keep secret)
- [ ] `RESEND_API_KEY` - Email service API key
- [ ] `NEXT_PUBLIC_SITE_URL` - Production domain

### Optional But Recommended
- [ ] `RAZORPAY_KEY_ID` - Payment gateway public key
- [ ] `RAZORPAY_KEY_SECRET` - Payment gateway secret key
- [ ] `RAZORPAY_WEBHOOK_SECRET` - Payment webhook secret
- [ ] `NEXT_PUBLIC_ANALYTICS_ID` - Analytics tracking ID

### Database Migrations
```sql
-- Add these columns to profiles table if not present
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS (
  tdee INTEGER,
  goal VARCHAR(50),
  region VARCHAR(50),
  diet VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT FALSE
);
```

---

## 🔐 Security Checklist

### Before Going Live
- [ ] All secrets are in environment variables (not in code)
- [ ] `.env.local` is in `.gitignore`
- [ ] Database credentials are secure
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Database backups are configured
- [ ] Monitoring and alerts are set up

### Secrets to Keep Private
```
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_SECRET
RESEND_API_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY (public but still important)
```

---

## 📊 Application Overview

### Technology Stack
- **Framework**: Next.js 16.3.1
- **UI Framework**: React 19.2.8
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email OTP)
- **Email**: Resend (Transactional email)
- **Payments**: Razorpay (Optional)
- **3D Graphics**: Three.js
- **Animations**: Framer Motion, GSAP

### Key Features
✅ Bilingual UI (English/Hindi)  
✅ TDEE Calculator (Mifflin-St Jeor formula)  
✅ 1000+ Meal Library with filtering  
✅ Food Scanner (Camera-based meal recognition)  
✅ Biomarker Tracking (4 health metrics)  
✅ Dark/Light Mode Support  
✅ Responsive Design  
✅ Premium Tier with paywall  

### Meal Library
- **Total Meals**: 1100+
- **Regions**: North, South, East, West India
- **Health Conditions**: Diabetes, PCOS, Thyroid, Anaemia
- **Languages**: English & Hindi
- **Complete Nutrition Data**: Protein, Carbs, Fat, Fiber

---

## 🚄 Performance Optimization

### Build Metrics
- Compiled: 6.8 seconds (Turbopack)
- Type Check: PASSED
- Total Routes: 18 (mix of static and dynamic)
- Static Pages: /, /privacy, /terms, /thank-you, /login, /profile, etc.
- Dynamic Pages: /dashboard, /dashboard/meals, /onboarding
- API Routes: 8 endpoints

### Production Build Size
Check `.next` folder after `npm run build`

### Recommended CDN Configuration
- Static assets from `.next/static` → CDN
- Images → Image optimization enabled
- API routes → Origin directly

---

## 📈 Deployment Platforms

### Vercel (Easiest)
```
1. Push to GitHub
2. Connect repo at vercel.com
3. Set environment variables
4. Auto-deploy on push
```

**Pros**: Zero-config, auto-scaling, global CDN  
**Cons**: Vendor lock-in

### Docker (Most Flexible)
```
1. Push image to registry (Docker Hub, ECR, etc.)
2. Deploy to any container platform:
   - Heroku
   - Railway
   - Fly.io
   - AWS ECS
   - Google Cloud Run
   - Digital Ocean App Platform
```

**Pros**: Works anywhere, full control  
**Cons**: More setup required

### Self-Hosted
```bash
# On your server:
docker-compose up -d

# Or with PM2:
npm install -g pm2
pm2 start npm --name poshan -- start
pm2 save && pm2 startup
```

---

## 🔧 Environment Setup by Platform

### For Vercel
1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Set Production Domain
4. Configure auto-deployments

### For Docker
1. Create `.env` from `.env.example`
2. Fill in production values
3. Run `docker-compose up -d`
4. Configure reverse proxy (nginx)

### For Self-Hosted
```bash
# Clone repository
git clone <repo> /opt/poshan
cd /opt/poshan

# Create environment file
cp .env.example .env
nano .env  # Edit with production values

# Install & build
npm ci
npm run build

# Run with PM2
pm2 start npm --name poshan -- start

# Set up reverse proxy (nginx/apache)
# Configure SSL/TLS
# Set up domain DNS
```

---

## 📱 Post-Deployment

### Verify Deployment
```bash
# Health check
curl https://your-domain.com/
# Should return HTML

# API test
curl https://your-domain.com/api/profile
# Should return 401 (unauthenticated) or user data

# Meal library test
# Sign in at https://your-domain.com/login
# Navigate to /dashboard/meals
# Should see 1000+ meals
```

### Monitor Application
- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Configure application logs
- [ ] Set up performance monitoring (Vercel Analytics, New Relic)
- [ ] Configure database backups
- [ ] Set up uptime monitoring

### Maintenance Tasks
- Daily: Monitor error logs
- Weekly: Check database size
- Monthly: Review user analytics
- Quarterly: Update dependencies

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
```
Check NEXT_PUBLIC_SUPABASE_URL and keys
Verify network access in Supabase settings
Check database quotas
```

### Meals Not Showing
```
Verify authentication is working
Check user onboarding_completed flag
Verify database has meal data
Check browser console for errors
```

### Email Not Sending
```
Verify RESEND_API_KEY is set
Check Resend dashboard for errors
Verify from email is configured
Check spam folder
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Monitor
1. **Performance**
   - Page load time
   - API response time
   - Database query time

2. **Usage**
   - Daily active users
   - Meal searches per day
   - Camera scans per day

3. **Revenue** (if using Razorpay)
   - Premium subscriptions
   - Conversion rate
   - Churn rate

4. **Health**
   - Error rate
   - Database usage
   - API quota usage

---

## 🔄 Scaling Strategy

### Current Capacity
- Built for small to medium production scale
- Database: Supabase (auto-scaling)
- CDN: Vercel or external CDN

### When to Scale
- 100K+ daily active users: Consider database optimization
- 1M+ daily API calls: Implement caching layer
- High compute: Consider serverless alternatives

### Optimization Opportunities
1. Add Redis caching for meal searches
2. Implement meal recommendations algorithm
3. Optimize images (Next.js Image component)
4. Add service worker for offline support
5. Implement pagination for meal library

---

## 📞 Support & Help

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Resend Docs](https://resend.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)

### Getting Help
1. Check error logs first
2. Review documentation
3. Search GitHub issues
4. Check Supabase status

---

## ✅ Deployment Checklist

### Final Review Before Going Live
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Build passes without errors
- [ ] Type checking passed
- [ ] Tests pass (if applicable)
- [ ] Login flow works
- [ ] Meals visible after auth
- [ ] Food scanner works
- [ ] Premium features gated correctly
- [ ] Email notifications sending
- [ ] Payments working (if enabled)
- [ ] Analytics tracking (if enabled)
- [ ] Monitoring configured
- [ ] Backups configured
- [ ] SSL/HTTPS enabled
- [ ] Domain configured
- [ ] CDN configured (optional)

---

**Status**: Ready for Production ✅  
**Last Updated**: August 22, 2026  
**Maintainer**: Daksh G

For questions or issues, check the [README.md](./README.md) or [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
