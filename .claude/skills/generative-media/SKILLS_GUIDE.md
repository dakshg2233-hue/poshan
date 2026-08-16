# 🎨 Poshan Generative Media Skills

A curated set of AI media generation skills integrated into your Poshan nutrition app. These skills use the **muapi-cli** to generate professional-grade images, videos, and marketing assets.

---

## 📋 Available Skills

### 🎯 **App Design & Branding** (Start Here)

#### 1. **UI Design** (`ui-design/`)
- **What it does**: Generate high-fidelity mobile/web UI mockups and app interfaces
- **Best for**: Redesigning app screens, creating new features, prototyping dashboard layouts
- **Input**: Description of what you want to design (e.g., "nutrition dashboard with daily intake tracker")
- **Output**: Professional mockup images following atomic design principles
- **Example**: Create a beautiful biomarker dashboard mockup for Poshan
- **Read more**: `ui-design/SKILL.md`

#### 2. **Logo Creator** (`logo-creator/`)
- **What it does**: Design a professional, minimalist logo for your brand
- **Best for**: Creating or refreshing the Poshan logo, generating brand variations
- **Input**: Brand name + style preferences (geometric, organic, minimalist, etc.)
- **Output**: High-quality vector logo with dark/light variants
- **Example**: "Create a minimalist Poshan nutrition logo with a leaf or thali motif"
- **Read more**: `logo-creator/SKILL.md`

#### 3. **Brand Kit** (`brand-kit/`)
- **What it does**: Generate a complete visual brand identity system
- **Best for**: Establishing cohesive branding across the app and marketing
- **Input**: Brand name + core brand values
- **Output**: Logo, color palette, typography pairings, and visual identity rules
- **Example**: "Build a comprehensive Poshan brand kit with Indian design elements"
- **Read more**: `brand-kit/SKILL.md`

---

### 📱 **Social Media & Marketing**

#### 4. **Instagram Post** (`instagram-post/`)
- **What it does**: Create polished, on-brand Instagram posts
- **Best for**: Growing your Poshan social presence, sharing health tips
- **Input**: Topic (e.g., "5 foods for better immunity") + style preferences
- **Output**: Hero image + caption + hashtags ready to post
- **Example**: "Create an Instagram post about iron-rich vegetarian foods"
- **Read more**: `instagram-post/SKILL.md`

#### 5. **YouTube Thumbnail** (`youtube-thumbnail/`)
- **What it does**: Design high-CTR YouTube thumbnails
- **Best for**: Creating video thumbnails that stand out and drive clicks
- **Input**: Video title + main subject/emotion
- **Output**: Striking thumbnail with bold text and emotional appeal
- **Example**: "Design a YouTube thumbnail for 'Understanding Your BMI - Indian Standards'"
- **Read more**: `youtube-thumbnail/SKILL.md`

#### 6. **Ad Creative Set** (`ad-creative/`)
- **What it does**: Generate high-converting ad creatives for Meta/Google/LinkedIn
- **Best for**: Running paid social campaigns to acquire users
- **Input**: Product/service description + target audience
- **Output**: Hero image + 3-5 copy variations + platform crops (Instagram, Facebook, Google Display, LinkedIn)
- **Example**: "Create ad creatives for 'Download Poshan - Track Your Nutrition'"
- **Read more**: `ad-creative/SKILL.md`

---

### 🎬 **Video & Product Showcase**

#### 7. **Product Ad Cinematic** (`product-ad-cinematic/`)
- **What it does**: Generate professional 5-10 second cinematic product videos
- **Best for**: Creating app promo videos, feature highlights, user testimonial videos
- **Input**: Product description + brand brief + mood/style
- **Output**: Cinematic video with professional effects and smooth transitions
- **Example**: "Create a 10-second app promo video showing Poshan's dashboard in action"
- **Read more**: `product-ad-cinematic/SKILL.md`

---

## 🚀 Quick Start

### Step 1: Install muapi-cli (One-time Setup)

```bash
npm install -g muapi-cli
```

### Step 2: Configure Your API Key

1. Get a free API key at: **https://muapi.ai/dashboard**
2. Configure it:
   ```bash
   muapi auth configure --api-key "YOUR_KEY_HERE"
   ```

### Step 3: Use a Skill

Each skill has a `SKILL.md` file. To use one:

1. Read the skill's `SKILL.md` for detailed inputs and steps
2. Follow the examples and run the provided commands
3. Check `scripts/` folder for ready-to-run bash scripts

**Example:**
```bash
cd ui-design
# Read SKILL.md first, then run:
bash scripts/generate-ui.sh --description "nutrition tracker dashboard" --view
```

---

## 📚 How to Choose Which Skill to Use

| Goal | Skill to Use |
|------|-------------|
| Refresh Poshan's visual identity | **Logo Creator** + **Brand Kit** |
| Redesign an app screen | **UI Design** |
| Create social media content | **Instagram Post** |
| Design video thumbnails | **YouTube Thumbnail** |
| Run paid ads campaign | **Ad Creative Set** |
| Create promotional videos | **Product Ad Cinematic** |
| Do everything above | Use all of them! |

---

## 🔧 Core Primitives

The `core/` folder contains low-level building blocks (file upload, image editing, API polling). You generally don't need to use these directly — the skills above use them automatically.

---

## 💡 Tips

- **Start small**: Try one skill first (e.g., Logo Creator) to see what's possible
- **Read each SKILL.md**: Each has detailed inputs, outputs, and examples
- **Use `--view` flag**: Most commands have a `--view` flag to download and preview results
- **API credits**: Each generation uses credits. Monitor your balance:
  ```bash
  muapi account balance
  ```

---

## ❓ Questions?

Each skill's `SKILL.md` has:
- Detailed input requirements
- Step-by-step execution instructions
- Notes for agents
- Example commands

**Still stuck?** Check the skill's `scripts/` folder for working examples.

---

## Next Steps

1. ✅ Read this guide (you're here!)
2. 📖 Pick a skill from above
3. 📄 Read its `SKILL.md` file
4. 🚀 Run the commands
5. 🎨 Integrate what you like into your app

Happy creating! 🎭
