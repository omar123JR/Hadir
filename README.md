<div align="center">
  
# 🎓 حاضر (Hadir)
**نظام الحضور الذكي وإدارة المحاضرات الأكاديمية**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**حاضر (Hadir)** هو نظام متكامل ومفتوح المصدر لإدارة الحضور والمحاضرات للجامعات والمعاهد. يوفر بيئة تواصل ذكية بين المعلم والطالب مع لوحات تحكم مخصصة وتوليد تقارير شاملة، مدعوماً بأعلى معايير الأمان (OWASP).

<br>
<img src="assets/hero.jpg" alt="Hadir Dashboard" width="800" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/>
<br><br>

---
</div>

## 📑 جدول المحتويات
- [✨ المميزات الأساسية](#-المميزات-الأساسية)
- [🛡️ معايير الأمان والحماية](#-معايير-الأمان-والحماية-owasp)
- [📂 هيكلية المشروع](#-هيكلية-المشروع-repository-structure)
- [🚀 البدء السريع (Quick Start)](#-البدء-السريع-quick-start)
- [🔑 حسابات تجريبية](#-حسابات-تجريبية-للاختبار)
- [🛠️ التقنيات المستخدمة](#-التقنيات-المستخدمة)

---

## ✨ المميزات الأساسية

* 📱 **الواجهة المتجاوبة (Mobile-First):** تصميم عصري (UI/UX) يعمل بسلاسة تامة على أجهزة الهاتف المحمول وأجهزة الكمبيوتر.
* 📸 **إدارة الحضور الذكية:** تسجيل حضور الطلاب باستخدام تقنية QR Code في الوقت الفعلي.
* 👨‍🏫 **لوحة تحكم المعلم (Teacher Dashboard):** إدارة المواد، رصد الدرجات، تعديل نسب الحضور للطلاب، وإصدار تقارير مخصصة لكل مادة.
* 👨‍🎓 **بوابة الطالب (Student Portal):** استعراض التقييمات، الدرجات، ونسب الحضور بسهولة، مع إمكانية استعراض المحاضرات والمقررات.
* 📊 **توليد التقارير وتصديرها:** إمكانية إصدار تقارير تفصيلية لكل مادة وتصديرها كملفات **Excel** بضغطة زر.

---

## 🛡️ معايير الأمان والحماية (OWASP)

تم أخذ الأمن السيبراني كأولوية قصوى في بناء هذا النظام. يحتوي المشروع على طبقات حماية مدمجة ضد أبرز الهجمات:
- **(Anti-Brute Force):** تحديد صارم لمحاولات تسجيل الدخول (Rate Limiting).
- **(DDoS & DoS Protection):** محدد طلبات شامل (Global Rate Limiter) لكافة الواجهات البرمجية.
- **(SQL Injection Prevention):** استخدام الاستعلامات المحضرة (Prepared Statements) بالإضافة لفلاتر Regex صارمة (Whitelist) تمنع إدخال الرموز المحجوزة.
- **(Cross-Site Scripting - XSS):** تعقيم تلقائي للمدخلات (Sanitization) مع إعداد ترويسات أمان قوية عبر `Helmet`.
- **(Buffer Overflow Prevention):** تقييد حجم حزم البيانات (Payload limits).
- **(HTTP Parameter Pollution):** منع تمرير مصفوفات خبيثة باستخدام تقنية HPP.

---

## 📂 هيكلية المشروع (Repository Structure)

```text
Hadir/
├── Backend/                 # الخادم (Node.js & Express)
│   ├── config/              # إعدادات النظام وقاعدة البيانات
│   ├── controllers/         # المتحكمات (منطق العمل)
│   ├── middleware/          # طبقات الحماية والتحقق
│   ├── routes/              # مسارات API
│   ├── schemas/             # قواعد التحقق (Zod Schemas)
│   ├── server.ts            # نقطة انطلاق الخادم (Entry point)
│   └── .env.example         # ملف إعدادات البيئة الافتراضي
│
├── eduflow-portal-main/     # الواجهة الأمامية (React & Vite)
│   ├── src/
│   │   ├── components/      # مكونات واجهة المستخدم (UI Components)
│   │   ├── contexts/        # إدارة الحالة (Context API)
│   │   ├── pages/           # صفحات النظام (Login, Dashboards)
│   │   └── lib/             # الوظائف المساعدة وتوليد التقارير
│   ├── index.html           # ملف HTML الأساسي
│   └── tailwind.config.js   # إعدادات التصميم
│
└── README.md                # هذا الملف
```

---

## 🚀 البدء السريع (Quick Start)

### المتطلبات المسبقة:
- تثبيت **[Node.js](https://nodejs.org/)** (يفضل الإصدار 18 فما فوق).
- تثبيت **[MySQL Server](https://www.mysql.com/)**.

### 1️⃣ إعداد قاعدة البيانات والخادم (Backend)
1. قم بإنشاء قاعدة بيانات جديدة في MySQL باسم `eduflow_db`.
2. افتح نافذة الأوامر وانتقل لمجلد الخادم:
   ```bash
   cd Backend
   cp .env.example .env
   npm install
   ```
3. افتح ملف `.env` وقم بتعديل بيانات الاتصال بقاعدة البيانات الخاصة بك.
4. قم بزرع البيانات التجريبية وهيكلة القاعدة:
   ```bash
   npm run seed
   # أو 
   node cleanAndSeed.js
   ```
5. شغل الخادم (سيعمل على المنفذ `3000`):
   ```bash
   npm run dev
   ```

### 2️⃣ تشغيل الواجهة الأمامية (Frontend)
في نافذة (Terminal) جديدة:
```bash
cd eduflow-portal-main
npm install
npm run dev
```
ستعمل الواجهة الأمامية على المنفذ `8091`. يمكنك الوصول إليها عبر: **`http://localhost:8091`**

---

## 🔑 حسابات تجريبية (للاختبار)

في حال قمت بتشغيل السكريبت التجريبي (`npm run seed`)، يمكنك اختبار المنظومة فوراً:

| الدور (Role) | البريد الإلكتروني (Email) | كلمة المرور (Password) |
|-------------|-------------------------|------------------------|
| **إدارة** | `admin` | `admin123` |
| **دكتور (معلم)** | `teacher@test.com` | `password123` |
| **طالب** | `student1@test.com` | `password123` |

---

## 🛠️ التقنيات المستخدمة

<div align="center">

### الواجهة الأمامية (Frontend)
<a href="https://skillicons.dev">
  <img src="https://skillicons.dev/icons?i=react,ts,tailwind,vite" alt="Frontend Tech Stack" />
</a>
<br>
<p><b>مكتبات إضافية:</b> Shadcn UI, Lucide Icons</p>

### الخادم الخلفي (Backend)
<a href="https://skillicons.dev">
  <img src="https://skillicons.dev/icons?i=nodejs,express,ts" alt="Backend Tech Stack" />
</a>
<br>
<p><b>مكتبات إضافية:</b> Zod</p>

### قواعد البيانات (Database)
<a href="https://skillicons.dev">
  <img src="https://skillicons.dev/icons?i=mysql" alt="Database Tech Stack" />
</a>
<br>
<p>مكتبة الاستعلامات: <code>mysql2</code></p>

### الأمان (Security)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![Helmet](https://img.shields.io/badge/Helmet-informational?style=for-the-badge)
![Bcrypt](https://img.shields.io/badge/Bcrypt-success?style=for-the-badge)
<br>
<p><b>أدوات أخرى:</b> Express-Rate-Limit, HPP</p>

</div>

---

## 📄 الترخيص (License)
هذا المشروع متاح للاستخدام الأكاديمي والمفتوح. (Open Source)
ماعدى علي البي , ممنوع .
