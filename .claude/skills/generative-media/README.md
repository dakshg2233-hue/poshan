# Generative Media Skills for Poshan

## ✅ Setup Complete

7 professional media generation skills are now ready in your Poshan app.

### 📂 Skills Installed

```
.claude/skills/generative-media/
├── ui-design/              # Generate UI mockups & app screens
├── logo-creator/           # Design professional logos
├── brand-kit/              # Build complete brand identity
├── instagram-post/         # Create social media content
├── youtube-thumbnail/      # Design video thumbnails
├── ad-creative/            # Multi-platform ad creatives
├── product-ad-cinematic/   # Generate promo videos
└── core/                   # Core API primitives (auto-used)
```

---

## 🚀 Getting Started

### 1. Install muapi-cli (One Time)

```bash
npm install -g muapi-cli
```

### 2. Get API Key & Configure

1. Visit: https://muapi.ai/dashboard
2. Sign up (free tier available)
3. Copy your API key
4. Configure:
   ```bash
   muapi auth configure --api-key "YOUR_KEY"
   ```

### 3. Pick a Skill & Read Its Guide

Browse available skills and read individual `SKILL.md` files:

- **[SKILLS_GUIDE.md](./SKILLS_GUIDE.md)** ← Start here for detailed descriptions
- **ui-design/SKILL.md** - UI mockup generation
- **logo-creator/SKILL.md** - Logo design
- **brand-kit/SKILL.md** - Complete branding
- **instagram-post/SKILL.md** - Social posts
- **youtube-thumbnail/SKILL.md** - Video thumbnails
- **ad-creative/SKILL.md** - Ad campaigns
- **product-ad-cinematic/SKILL.md** - Promo videos

### 4. Run a Skill

Example — generate a Poshan logo:

```bash
cd logo-creator
bash scripts/generate-logo.sh \
  --brand "Poshan" \
  --style "minimalist" \
  --view
```

---

## 💡 Quick Examples

**Create a nutrition dashboard mockup:**
```bash
cd ui-design
bash scripts/generate-ui.sh \
  --description "nutrition tracking dashboard showing daily biomarkers and meal plan" \
  --view
```

**Design an Instagram post:**
```bash
cd instagram-post
bash scripts/generate-post.sh \
  --topic "5 iron-rich vegetarian foods for better health" \
  --view
```

**Make a YouTube thumbnail:**
```bash
cd youtube-thumbnail
bash scripts/generate-thumbnail.sh \
  --title "Understanding Your BMI - Indian Standards" \
  --view
```

---

## 📖 Next Step

👉 **Read [SKILLS_GUIDE.md](./SKILLS_GUIDE.md)** for detailed descriptions, examples, and how to choose which skills to integrate.

Then pick the skill you want to use and read its individual `SKILL.md` file!

---

## ❓ Troubleshooting

**muapi: command not found**
```bash
npm install -g muapi-cli
```

**API key not configured**
```bash
muapi auth configure --api-key "YOUR_KEY"
```

**Check your API balance**
```bash
muapi account balance
```

---

Enjoy creating! 🎨
