'use client'
import React from 'react';
import wmDark from './photos/wm-dark.png';
import wmLight from './photos/wm-light.png';
import wmLime from './photos/wm-onlime.png';

const features = [
    { n: '1', t: 'حجز أونلاين من الموبايل', d: 'العميل يختار الحلاق والخدمة والميعاد من لينك واحد، من غير مكالمات ولا رسائل رايحة جاية.' },
    { n: '2', t: 'جدول الحلاقين في مكان واحد', d: 'شوف مواعيد كل حلاق وإيه المحجوز وإيه الفاضي، وتجنّب تضارب المواعيد.' },
    { n: '3', t: 'باقات وإضافات', d: 'باقات الحلاقة، حلاقة في البيت، وإضافة مشروب على الباقة.' },
    { n: '4', t: 'تقييم بعد كل جلسة', d: 'العميل يقيّم بعد الحلاقة، وانت تعرف مين شغّال كويس وإيه اللي محتاج تحسين.' },
    { n: '5', t: 'ملف لكل عميل', d: 'سجل زياراته وخدماته، عشان تعرف عميلك من أول ما يدخل.' },
    { n: '6', t: 'إدارة الصالون', d: 'الخدمات والأسعار والحلاقين والمواعيد كلها من لوحة تحكم واحدة.' },
];
const tones = ['dk', 'wh', 'lm', 'lm', 'wh', 'dk'];
const steps = [
    { t: 'العميل يفتح لينك الصالون', d: 'من إنستجرام أو واتساب أو أي مكان.' },
    { t: 'يختار الخدمة والحلاق والميعاد', d: 'المواعيد الفاضية بس هي اللي بتظهر له.' },
    { t: 'الحجز يوصل لك', d: 'يظهر في الجدول، وتتابع الجلسة وتقييمها بعدها.' },
];
const slots = ['4:00 PM', '5:30 PM', '7:00 PM'];

export default function LandingApp() {
    const go = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };
    return <div className="hq" dir="rtl" lang="ar">
        <div className="hq-nav">
            <img className="hq-logo" src={wmDark.src} alt="الحلاق" />
            <a className="hq-pill" href="#demo" onClick={go('demo')}>شوف الحجز</a>
        </div>

        <header className="hq-hero">
            <div className="hq-dots" />
            <div className="hq-hero-copy">
                <p className="hq-kicker">نظام حجز وإدارة صالونات الحلاقة</p>
                <h1>املا كراسيك،<br />وسيب الحجز علينا.</h1>
                <p className="hq-lead">عملاؤك بيحجزوا من الموبايل، وانت تدير الحلاقين والمواعيد والباقات والتقييمات من مكان واحد.</p>
                <div className="hq-row">
                    <a className="hq-btn" href="#demo" onClick={go('demo')}>شوف شكل الحجز</a>
                    <a className="hq-btn hq-ghost" href="#features" onClick={go('features')}>شوف المميزات</a>
                </div>
            </div>
            <div className="hq-hero-art"><div className="hq-tilt"><img src={wmLime.src} alt="الحلاق" /></div></div>
        </header>

        <section className="hq-sec" id="features">
            <h2>كل اللي صالونك محتاجه</h2>
            <div className="hq-grid">
                {features.map((f, i) => <article key={f.t} className={`hq-card hq-${tones[i]}`}>
                    <span className="hq-num">{f.n}</span>
                    <h3>{f.t}</h3>
                    <p>{f.d}</p>
                </article>)}
            </div>
        </section>

        <section className="hq-steps-sec">
            <div className="hq-split">
                <div>
                    <h2>الحجز في 3 خطوات</h2>
                    <ol className="hq-steps">
                        {steps.map((s, i) => <li key={s.t}><span className="hq-num">{i + 1}</span><div><strong>{s.t}</strong><p>{s.d}</p></div></li>)}
                    </ol>
                </div>
                <div className="hq-mock" id="demo" aria-label="نموذج توضيحي لشاشة الحجز، غير مفعّل">
                    <p className="hq-tag">نموذج توضيحي، مش شغال</p>
                    <p className="hq-mock-h">احجز ميعاد</p>
                    <div className="hq-mrow"><span>الخدمة</span><b>حلاقة + دقن</b></div>
                    <div className="hq-mrow"><span>الحلاق</span><b>اختار حلاقك</b></div>
                    <p className="hq-mock-s">مواعيد فاضية</p>
                    <div className="hq-slots">{slots.map((s, i) => <span key={s} className={i === 1 ? 'on' : ''}>{s}</span>)}</div>
                    <span className="hq-mbtn">أكّد الحجز</span>
                    <p className="hq-note">الأزرار هنا للعرض فقط ومفيش حجز فعلي</p>
                </div>
            </div>
        </section>

        <section className="hq-sec">
            <h2>للحلاق اللي عايز يكبّر شغله</h2>
            <div className="hq-grid">
                <p className="hq-card hq-wh hq-b">مواعيد أقل ضايعة وزباين أقل بتنسى.</p>
                <p className="hq-card hq-wh hq-b">عروض وباقات تزوّد قيمة الزيارة.</p>
                <p className="hq-card hq-wh hq-b">تقييمات توريك مستوى الخدمة بصراحة.</p>
            </div>
        </section>

        <section className="hq-close" id="start">
            <h2>النسخة التجريبية قريبًا</h2>
            <p>طريقة التواصل لطلب النسخة التجريبية لسه هتتضاف.</p>
            <span className="hq-btn hq-off" aria-disabled="true">طلب النسخة التجريبية غير متاح حاليًا</span>
        </section>
        <footer className="hq-foot"><img src={wmDark.src} alt="الحلاق" /><span>نظام حجز وإدارة الصالونات</span></footer>
    </div>;
}
