(() => {
  'use strict';
  const DATA = window.MATH8;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const KEY = 'math8_pro_state_v1';
  const defaultState = { selectedChapters:[1,2], activeView:'home', lessonChecks:[], attempts:[], mastered:[], needsWork:[] };
  let state = loadState();
  let activeChapter = 1;
  let activeLesson = 0;
  let activeQuiz = null;
  let timerHandle = null;
  let revealed = new Set();
  let bankAnswers = {};
  let bankResults = {};
  let deferredInstall = null;
  const root = $('#viewRoot');

  function loadState(){
    try { return {...defaultState, ...(JSON.parse(localStorage.getItem(KEY)||'{}'))}; }
    catch { return {...defaultState}; }
  }
  function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function chapter(id){ return DATA.chapters.find(c=>c.id===Number(id)); }
  function questionsFor(ids){ return DATA.questions.filter(q=>ids.includes(q.ch)); }
  function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),2600); }
  function faNum(n){ return String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]); }
  function pageTitle(txt){ $('#pageTitle').textContent=txt; }
  function setView(view){
    if(timerHandle){clearInterval(timerHandle);timerHandle=null;}
    state.activeView=view; saveState();
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    $('#sidebar').classList.remove('open');
    render();
  }
  function renderSidebar(){
    $('#chapterToggles').innerHTML = DATA.chapters.map(c=>`<label class="chapter-toggle"><input type="checkbox" data-select-ch="${c.id}" ${state.selectedChapters.includes(c.id)?'checked':''}><span>${faNum(c.id)}. ${esc(c.title)}</span></label>`).join('');
  }
  function render(){
    renderSidebar();
    const map={home:renderHome,lessons:renderLessons,memorise:renderMemorise,exams:renderExams,bank:renderBank,videos:renderVideos,book:renderBook,progress:renderProgress};
    (map[state.activeView]||renderHome)();
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===state.activeView));
    bindCommon();
  }
  function bindCommon(){
    $$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
    $$('[data-select-ch]').forEach(el=>el.addEventListener('change',()=>{
      const id=Number(el.dataset.selectCh);
      state.selectedChapters = el.checked ? [...new Set([...state.selectedChapters,id])] : state.selectedChapters.filter(x=>x!==id);
      if(!state.selectedChapters.length){state.selectedChapters=[id];el.checked=true;toast('برای آزمون‌سازی دست‌کم یک فصل انتخاب کن.');}
      saveState(); render();
    }));
    $('#mobileMenu')?.addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  }

  function renderHome(){
    pageTitle('داشبورد');
    const done=state.lessonChecks.length;
    const attempts=state.attempts.length;
    const best=attempts?Math.max(...state.attempts.map(a=>a.score)):0;
    const avg=attempts?Math.round(state.attempts.reduce((s,a)=>s+a.score,0)/attempts):0;
    root.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">یادگیری مفهومی · تمرین هدفمند · سنجش واقعی</div>
          <h1>ریاضی هشتم را <em>مسلط</em> شو، نه حفظی.</h1>
          <p>درس‌نامه‌های فصل‌به‌فصل، حفظیات کلیدی، ۷۵ سؤال تمرینی، پنج آزمون آماده و آزمون‌ساز دلخواه. فصل‌های ۱ و ۲ با جزئیات بیشتر از کتاب بارگذاری‌شده استخراج شده‌اند.</p>
          <div class="hero-actions"><button class="btn btn-primary" data-go="lessons">شروع مطالعه فصل ۱ ←</button> <button class="btn btn-secondary" data-go="exams">رفتن به آزمون‌ها</button></div>
        </div>
        <img class="hero-art" src="assets/math-hero.svg" alt="تصویر هندسی ریاضی">
      </section>
      <section class="stats-grid">
        <div class="stat-card"><div><div class="stat-label">فصل‌های کتاب</div><div class="stat-value">۹</div></div><div class="stat-icon">▦</div></div>
        <div class="stat-card"><div><div class="stat-label">سؤال در بانک</div><div class="stat-value">${faNum(DATA.questions.length)}</div></div><div class="stat-icon">✎</div></div>
        <div class="stat-card"><div><div class="stat-label">آزمون‌های انجام‌شده</div><div class="stat-value">${faNum(attempts)}</div></div><div class="stat-icon">◈</div></div>
        <div class="stat-card"><div><div class="stat-label">بهترین نمره</div><div class="stat-value">${faNum(best)}٪</div></div><div class="stat-icon">★</div></div>
      </section>
      <div class="section-head"><div><h2>فصل‌های ریاضی هشتم</h2><p>برای ورود به درس‌نامه یا دیدن تمرین‌های هر فصل، روی کارت آن بزن.</p></div><button class="text-link" data-go="lessons">همهٔ درس‌نامه‌ها ←</button></div>
      <section class="chapter-grid">${DATA.chapters.map(c=>chapterCard(c)).join('')}</section>
      <section class="split-grid">
        <div class="panel"><h3>ادامهٔ مسیر مطالعه</h3>
          <div class="recent-row"><div><strong>فصل ۱ · عددهای صحیح و گویا</strong><small>چهار درس؛ از ترتیب عملیات تا تقسیم عددهای گویا</small></div><button class="btn btn-quiet btn-small" data-open-ch="1">ادامه</button></div>
          <div class="recent-row"><div><strong>فصل ۲ · عددهای اول</strong><small>عددهای اول و مرکب، تجزیه و روش غربال</small></div><button class="btn btn-quiet btn-small" data-open-ch="2">ادامه</button></div>
          <div class="recent-row"><div><strong>میانگین نمرهٔ آزمون‌ها</strong><small>از ${faNum(attempts)} آزمون ثبت‌شده</small></div><strong style="color:var(--cyan)">${faNum(avg)}٪</strong></div>
        </div>
        <div class="panel"><h3>برنامهٔ پیشنهادی امروز</h3>
          <ul class="bullet-list"><li>۱۵ دقیقه درس‌نامهٔ عددهای گویا را بخوان.</li><li>۱۰ کارت حفظی فصل ۱ را مرور کن.</li><li>آزمون ۱ را بدون نگاه به پاسخ‌ها انجام بده.</li><li>غلط‌ها را از بخش عملکرد من دوباره تمرین کن.</li></ul>
          <div style="margin-top:14px"><button class="btn btn-primary btn-small" data-go="memorise">مرور حفظیات</button></div>
        </div>
      </section>`;
    $$('[data-go]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.go)));
    $$('[data-open-ch]').forEach(b=>b.addEventListener('click',()=>{activeChapter=Number(b.dataset.openCh);activeLesson=0;setView('lessons');}));
    $$('[data-card-ch]').forEach(b=>b.addEventListener('click',()=>{activeChapter=Number(b.dataset.cardCh);activeLesson=0;setView('lessons');}));
  }
  function chapterCard(c){
    return `<article class="chapter-card" data-card-ch="${c.id}" role="button" tabindex="0">
      <div class="chapter-index">${faNum(c.id)}</div><h3>${esc(c.title)}</h3><p>${esc(c.intro)}</p>
      <div class="chapter-meta"><span>صفحه‌های ${esc(c.page)}</span><span class="badge ${c.id<=2?'complete':'starter'}">${c.id<=2?'درس‌نامهٔ کامل':'خلاصهٔ آغازین'}</span></div>
    </article>`;
  }

  function renderLessons(){
    pageTitle('درس‌نامه‌ها');
    const c=chapter(activeChapter);
    root.innerHTML=`
      <div class="page-intro"><div class="kicker">کتاب درسی · ۹ فصل</div><h1>درس‌نامه‌ها و نکته‌های امتحانی</h1><p>فصل را انتخاب کن، درس‌هایش را مرور کن و نکته‌های هر فصل را با مثال و فرمول یاد بگیر. برای فصل‌های ۱ و ۲ محتوا با جزئیات بیشتری از PDF خودت استخراج شده است.</p></div>
      <div class="toolbar"><select class="select" id="lessonChapter">${DATA.chapters.map(x=>`<option value="${x.id}" ${x.id===activeChapter?'selected':''}>فصل ${faNum(x.id)} · ${esc(x.title)}</option>`).join('')}</select><span class="badge ${c.id<=2?'complete':'starter'}">${esc(c.level)}</span></div>
      <div class="lesson-layout">
        <aside class="panel lesson-list"><h3>درس‌های فصل ${faNum(c.id)}</h3>${c.lessons.map((l,i)=>`<button class="lesson-select ${i===activeLesson?'active':''}" data-lesson-index="${i}"><strong>${faNum(i+1)}. ${esc(l.title)}</strong><small style="display:block;color:#888;margin-top:4px">صفحه ${esc(l.pages)}</small></button>`).join('')}</aside>
        <div class="lesson-main" id="lessonMain">${renderLessonBody(c)}</div>
      </div>`;
    $('#lessonChapter').addEventListener('change',e=>{activeChapter=Number(e.target.value);activeLesson=0;renderLessons();});
    $$('[data-lesson-index]').forEach(b=>b.addEventListener('click',()=>{activeLesson=Number(b.dataset.lessonIndex);renderLessons();}));
    $('#markLesson')?.addEventListener('change',e=>{
      const key=`${activeChapter}-${activeLesson}`;
      state.lessonChecks=e.target.checked?[...new Set([...state.lessonChecks,key])]:state.lessonChecks.filter(x=>x!==key);
      saveState();toast(e.target.checked?'این درس به‌عنوان مطالعه‌شده ثبت شد.':'علامت مطالعه برداشته شد.');
    });
  }
  function renderLessonBody(c){
    return renderLessonBodyInner(c);
  }

  function renderLessonBodyInner(c){
    const l=c.lessons[activeLesson]||c.lessons[0];
    const key=`${c.id}-${activeLesson}`;
    const checked=state.lessonChecks.includes(key);
    return `<div class="lesson-banner"><div class="eyebrow">فصل ${faNum(c.id)} · درس ${faNum(activeLesson+1)} · ${esc(l.pages)}</div><h2>${esc(l.title)}</h2><p>${esc(l.detail)}</p></div>
      <label class="lesson-progress"><input type="checkbox" id="markLesson" ${checked?'checked':''}> این درس را خواندم و تمرین کردم</label>
      <div class="section-head"><div><h2>مفهوم‌های اصلی فصل</h2><p>تعریف‌ها را با زبان خودت بازگو کن.</p></div></div>
      <div class="info-grid">${c.concepts.map(([a,b])=>`<article class="info-card"><h4>${esc(a)}</h4><p>${esc(b)}</p></article>`).join('')}</div>
      <div class="section-head"><div><h2>قانون‌ها و روش حل</h2><p>این بخش را همراه با حل یک مثال تمرین کن.</p></div></div>
      <div class="panel"><ul class="bullet-list">${c.rules.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div>
      <div class="section-head"><div><h2>فرمول‌ها و رابطه‌ها</h2><p>فرمول را حفظ نکن؛ بدان هر نماد چه معنایی دارد.</p></div></div>
      <div class="panel formula-list">${c.formulas.map(([a,b])=>`<div class="formula-item"><span>${esc(a)}</span><code dir="ltr">${esc(b)}</code></div>`).join('')}</div>
      ${c.worked?`<div class="section-head"><div><h2>مثال‌های حل‌شده</h2><p>اول خودت حل کن؛ بعد راه‌حل را بخوان.</p></div></div><div class="info-grid">${c.worked.map(([a,b])=>`<article class="info-card"><h4>${esc(a)}</h4><p>${esc(b)}</p></article>`).join('')}</div>`:''}
      <div class="section-head"><div><h2>دام‌های پرتکرار</h2><p>این موارد باعث اشتباه‌های ساده و از دست رفتن نمره می‌شوند.</p></div></div>
      <div class="callout">${c.pitfalls.map(x=>`• ${esc(x)}`).join('<br>')}</div>
      <div class="section-head"><div><h2>تمرین همین فصل</h2><p>از بانک سؤال، فقط تمرین‌های این فصل را باز کن.</p></div><button class="btn btn-secondary btn-small" id="practiceChapter">رفتن به سؤال‌ها</button></div>
      <div class="bank-summary"><span>${faNum(DATA.questions.filter(q=>q.ch===c.id).length)} سؤال برای این فصل</span><span>منبع: ${esc(c.source)}</span></div>`;
  }

  function renderMemorise(){
    pageTitle('حفظیات و فرمول‌ها');
    const ids=state.selectedChapters.length?state.selectedChapters:[1,2];
    const cards=DATA.chapters.filter(c=>ids.includes(c.id)).flatMap(c=>c.memorise.map((x,i)=>({ch:c.id,index:i,front:x[0],back:x[1]})));
    root.innerHTML=`<div class="page-intro"><div class="kicker">مرور فعال · فلش‌کارت</div><h1>حفظیات و فرمول‌های مهم</h1><p>اول روی سؤال فکر کن، بعد کارت را باز کن. کارت‌هایی را که بلدی علامت بزن؛ موارد سخت در بخش «نیاز به تمرین» عملکردت ذخیره می‌شوند.</p></div>
      <div class="toolbar"><span class="badge">فصل‌های انتخاب‌شده: ${ids.map(faNum).join('، ')}</span><span class="badge">${faNum(cards.length)} کارت</span><button class="btn btn-quiet btn-small" id="showAllCards">نمایش پاسخ‌ها</button></div>
      <div class="flash-grid">${cards.map((c,i)=>{const id=`${c.ch}-${c.index}`;const known=state.mastered.includes(id);const needs=state.needsWork.includes(id);return `<article class="flash-card" data-flash="${i}"><div class="front">${esc(c.front)}</div><div class="back hidden">${esc(c.back)}</div><div class="hint">برای دیدن پاسخ ضربه بزن</div><div class="flash-actions"><button data-master="${id}" class="${known?'active':''}">✓ بلدم</button><button data-needs="${id}">${needs?'✓ نیاز به مرور':'نیاز به تمرین'}</button></div></article>`;}).join('')}</div>`;
    $$('[data-flash]').forEach(card=>card.addEventListener('click',e=>{if(e.target.closest('button'))return;card.querySelector('.back').classList.toggle('hidden');card.querySelector('.hint').textContent=card.querySelector('.back').classList.contains('hidden')?'برای دیدن پاسخ ضربه بزن':'برای بستن پاسخ دوباره ضربه بزن';}));
    $('#showAllCards')?.addEventListener('click',()=>{$$('.flash-card .back').forEach(el=>el.classList.remove('hidden'));$$('.flash-card .hint').forEach(el=>el.textContent='پاسخ نمایش داده شد');});
    $$('[data-master]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=b.dataset.master;state.mastered=state.mastered.includes(id)?state.mastered.filter(x=>x!==id):[...state.mastered,id];state.needsWork=state.needsWork.filter(x=>x!==id);saveState();renderMemorise();}));
    $$('[data-needs]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=b.dataset.needs;state.needsWork=state.needsWork.includes(id)?state.needsWork.filter(x=>x!==id):[...state.needsWork,id];state.mastered=state.mastered.filter(x=>x!==id);saveState();renderMemorise();}));
  }

  function renderExams(){
    pageTitle('آزمون‌ها');
    const count=questionsFor(state.selectedChapters).length;
    root.innerHTML=`<div class="page-intro"><div class="kicker">ارزشیابی · زمان‌دار · خودکار</div><h1>آزمون‌های آماده و آزمون‌ساز</h1><p>پنج آزمون از فصل‌های ۱ و ۲ آماده است. از بخش آزمون‌ساز هم می‌توانی هر ترکیبی از فصل‌های کتاب را انتخاب کنی و یک آزمون تازه بسازی.</p></div>
      <div class="section-head"><div><h2>۵ آزمون آماده</h2><p>پاسخ‌ها تا پایان آزمون نمایش داده نمی‌شوند.</p></div><span class="badge complete">نمره‌دهی خودکار</span></div>
      <div class="exam-grid">${DATA.exams.map((e,i)=>`<article class="exam-card"><div class="question-top"><span class="question-tag">آزمون ${faNum(i+1)}</span><span class="badge">فصل ${e.id==='e3'?'۲':e.id==='e1'||e.id==='e2'?'۱':'۱ و ۲'}</span></div><h3>${esc(e.title)}</h3><p>${esc(e.subtitle)}</p><div class="exam-meta"><span>◷ ${faNum(e.duration)} دقیقه</span><span>▦ ${faNum(e.qids.length)} سؤال</span><span>۱۰۰ نمره</span></div><button class="btn btn-primary" data-start-exam="${e.id}">شروع آزمون ←</button></article>`).join('')}</div>
      <div class="section-head"><div><h2>آزمون دلخواه</h2><p>فصل‌ها را از ستون سمت راست انتخاب کن یا از اینجا مستقیم تغییر بده.</p></div></div>
      <div class="panel"><div class="toolbar"><select id="customCount" class="select"><option value="5">۵ سؤال</option><option value="10" selected>۱۰ سؤال</option><option value="15">۱۵ سؤال</option><option value="20">۲۰ سؤال</option></select><select id="customDiff" class="select"><option value="all">همهٔ سطح‌ها</option><option value="1">آسان</option><option value="2">متوسط</option><option value="3">چالشی</option></select><select id="customType" class="select"><option value="all">ترکیبی از همهٔ نوع‌ها</option><option value="choice">چهارگزینه‌ای</option><option value="input">پاسخ کوتاه / جاخالی</option><option value="boolean">درست یا نادرست</option></select><button class="btn btn-primary" id="makeCustom" ${count?'':'disabled'}>ساخت و شروع آزمون</button></div><div class="bank-summary"><span>فصل‌های فعال: ${state.selectedChapters.map(faNum).join('، ')||'—'}</span><span>${faNum(count)} سؤال در بانک این فصل‌ها</span><span>نمره پس از ثبت پاسخ‌ها محاسبه می‌شود.</span></div></div>`;
    $$('[data-start-exam]').forEach(b=>b.addEventListener('click',()=>{const ex=DATA.exams.find(x=>x.id===b.dataset.startExam);startQuiz(ex.title,ex.qids.map(id=>DATA.questions.find(q=>q.id===id)),ex.duration);}));
    $('#makeCustom')?.addEventListener('click',()=>{
      let pool=questionsFor(state.selectedChapters);
      const diff=$('#customDiff').value, type=$('#customType').value;
      if(diff!=='all') pool=pool.filter(q=>q.diff===Number(diff));
      if(type!=='all') pool=pool.filter(q=>q.type===type);
      if(pool.length<2){toast('برای این انتخاب سؤال کافی وجود ندارد. فصل دیگری هم انتخاب کن.');return;}
      const n=Math.min(Number($('#customCount').value),pool.length);
      const pick=shuffle(pool).slice(0,n);
      startQuiz('آزمون دلخواه · '+state.selectedChapters.map(faNum).join('، '),pick,Math.max(8,Math.ceil(n*1.5)));
    });
  }
  function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

  function startQuiz(title,qs,minutes){
    if(timerHandle){clearInterval(timerHandle);timerHandle=null;}
    activeQuiz={title,questions:qs,answers:{},duration:minutes*60,remaining:minutes*60,started:Date.now(),finished:false};
    renderQuiz();
    timerHandle=setInterval(()=>{
      if(!activeQuiz||activeQuiz.finished)return;
      activeQuiz.remaining=Math.max(0,activeQuiz.duration-Math.floor((Date.now()-activeQuiz.started)/1000));
      const t=$('#timerValue');if(t)t.textContent=formatTime(activeQuiz.remaining);
      if(activeQuiz.remaining<=0){finishQuiz(true);}
    },500);
  }
  function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function renderQuiz(){
    pageTitle('در حال آزمون');
    const qz=activeQuiz;
    root.innerHTML=`<div class="page-intro"><div class="kicker">آزمون فعال · پاسخ‌ها را ثبت کن</div><h1>${esc(qz.title)}</h1><p>برای هر سؤال یک گزینه انتخاب کن یا پاسخ را وارد کن. پاسخ تشریحی و نمره پس از پایان آزمون نمایش داده می‌شود.</p></div>
      <div class="quiz-head"><div><h2>${esc(qz.title)}</h2><p>${faNum(qz.questions.length)} سؤال · ${faNum(qz.duration/60)} دقیقه زمان اولیه</p></div><div class="timer" id="timerValue">${formatTime(qz.remaining)}</div></div>
      <div class="question-list">${qz.questions.map((q,i)=>questionCard(q,i,{quiz:true})).join('')}</div>
      <div class="quiz-actions"><span class="bank-summary"><span>${faNum(qz.questions.length)} سؤال</span><span>پاسخ‌های ثبت‌شده: <b id="answeredCount">${faNum(Object.keys(qz.answers).length)}</b></span></span><button class="btn btn-primary" id="submitQuiz">ثبت پاسخ‌ها و دیدن نمره</button></div>`;
    bindQuizInputs();
    $('#submitQuiz').addEventListener('click',()=>finishQuiz(false));
    root.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function questionCard(q,i,opt={}){
    const ans=opt.quiz?activeQuiz.answers[q.id]:(opt.bank?bankAnswers[q.id]:null);
    const show=opt.showSolution||false;
    const result=opt.results?.[q.id]||bankResults[q.id];
    let control='';
    if(q.type==='choice'){
      control=`<div class="options">${q.options.map((x,j)=>`<label class="option"><input type="radio" name="${opt.bank?'bank-'+q.id:q.id}" value="${j}" ${String(ans)===String(j)?'checked':''} ${(opt.disabled||(opt.bank&&show))?'disabled':''}><span>${faNum(j+1)}. ${esc(x)}</span></label>`).join('')}</div>`;
    } else if(q.type==='boolean'){
      control=`<div class="options"><label class="option"><input type="radio" name="${opt.bank?'bank-'+q.id:q.id}" value="درست" ${ans==='درست'?'checked':''} ${(opt.disabled||(opt.bank&&show))?'disabled':''}><span>درست</span></label><label class="option"><input type="radio" name="${opt.bank?'bank-'+q.id:q.id}" value="نادرست" ${ans==='نادرست'?'checked':''} ${(opt.disabled||(opt.bank&&show))?'disabled':''}><span>نادرست</span></label></div>`;
    } else {
      const answerAttr = opt.bank ? `data-bank-answer="${q.id}"` : `data-answer="${q.id}"`;
      control=`<input class="text-input answer-input" type="text" inputmode="text" ${answerAttr} value="${esc(ans||'')}" placeholder="پاسخ را وارد کن" ${(opt.disabled||(opt.bank&&show))?'disabled':''}>`;
    }
    const resultClass=result?(result.correct?'result-correct':'result-wrong'):'';
    const answerLabel=show?`<div class="solution"><strong>${result?(result.correct?'✓ پاسخ درست':'✕ پاسخ نادرست'):'پاسخ:'}</strong> ${esc(displayAnswer(q))}<br>${esc(q.solution)}</div>`:'';
    return `<article class="question-card ${resultClass}" data-qcard="${q.id}">
      <div class="question-top"><span class="question-tag">${esc(q.tag)} · ${q.diff===1?'آسان':q.diff===2?'متوسط':'چالشی'}</span><span class="question-number">سؤال ${faNum(i+1)} · فصل ${faNum(q.ch)}</span></div>
      <p class="question-text">${esc(q.q)}</p>${control}${answerLabel}
      ${opt.bank&&!show?`<button class="btn btn-secondary btn-small" style="margin-top:10px" data-check-bank="${q.id}">بررسی پاسخ من</button>`:''}
    </article>`;
  }
  function displayAnswer(q){return q.type==='choice'?q.options[q.answer]:q.answer;}
  function bindQuizInputs(){
    activeQuiz.questions.forEach(q=>{
      $$(`input[name="${q.id}"]`).forEach(el=>el.addEventListener('change',()=>{activeQuiz.answers[q.id]=el.value;updateAnswered();}));
      $$(`[data-answer="${q.id}"]`).forEach(el=>el.addEventListener('input',()=>{activeQuiz.answers[q.id]=el.value;updateAnswered();}));
    });
  }
  function updateAnswered(){const el=$('#answeredCount');if(el)el.textContent=faNum(Object.values(activeQuiz.answers).filter(v=>String(v).trim()!=='').length);}
  function normalize(s){
    return String(s??'').toLowerCase().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[−–—]/g,'-').replace(/٫/g,'.').replace(/،/g,',').replace(/×|·/g,'*').replace(/²/g,'^2').replace(/³/g,'^3').replace(/[\s\u200c\u200f\u200e]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک');
  }
  function parseScalar(v){
    let s=normalize(v);
    if(!s)return null;
    if(/^[-+]?0\/[0-9]+$/.test(s)) s=s.replace('/','.'); // slash-decimal notation used in Persian school books
    const fm=s.match(/^([-+]?\d+)\/([-+]?\d+)$/);
    if(fm){const den=Number(fm[2]);if(!den)return null;return Number(fm[1])/den;}
    if(/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(s)){const n=Number(s);return Number.isFinite(n)?n:null;}
    return null;
  }
  function isCorrect(q,val){
    const user=String(val??'').trim(); if(!user)return false;
    if(q.type==='choice')return Number(user)===Number(q.answer);
    const expected=[q.answer,...(q.aliases||[])].map(normalize);
    const nu=normalize(user);
    if(expected.includes(nu))return true;
    const u=parseScalar(user), a=parseScalar(q.answer);
    return u!==null&&a!==null&&Math.abs(u-a)<1e-8;
  }
  function finishQuiz(auto){
    if(!activeQuiz||activeQuiz.finished)return;
    activeQuiz.finished=true;
    if(timerHandle){clearInterval(timerHandle);timerHandle=null;}
    const qs=activeQuiz.questions;
    const results={};let correct=0;
    qs.forEach(q=>{const ok=isCorrect(q,activeQuiz.answers[q.id]);results[q.id]={correct:ok};if(ok)correct++;});
    const score=Math.round(correct/qs.length*100);
    const attempt={title:activeQuiz.title,score,total:qs.length,correct,date:new Date().toISOString(),chapters:[...new Set(qs.map(q=>q.ch))]};
    state.attempts.unshift(attempt);state.attempts=state.attempts.slice(0,100);saveState();
    renderQuizResult(results,attempt,auto);
  }
  function renderQuizResult(results,attempt,auto){
    pageTitle('نتیجهٔ آزمون');
    const qs=activeQuiz.questions;
    root.innerHTML=`<div class="page-intro"><div class="kicker">کارنامهٔ آزمون</div><h1>نتیجه را تحلیل کن؛ فقط نمره مهم نیست.</h1><p>${auto?'زمان آزمون تمام شد و پاسخ‌های ثبت‌شده بررسی شدند.':'آزمون با موفقیت ثبت شد.'} سؤال‌های غلط را دوباره حل کن و بعد به درس‌نامه برگرد.</p></div>
      <div class="score-hero"><div class="score-circle" style="background:conic-gradient(var(--green) ${attempt.score*3.6}deg,#34303e 0)">${faNum(attempt.score)}٪</div><div><h2>${attempt.score>=90?'عالی؛ تسلطت خوب است.':attempt.score>=70?'خوب است؛ چند نقطه‌ضعف داری.':attempt.score>=50?'متوسط؛ دوباره درس‌نامه را بخوان.':'هنوز آماده نیستی؛ از پایه تمرین کن.'}</h2><p>${faNum(attempt.correct)} پاسخ درست از ${faNum(attempt.total)} سؤال · ${attempt.score>=90?'حالا سراغ آزمون سخت‌تر برو.':'غلط‌ها را بخوان و فردا دوباره امتحان بده.'}</p></div></div>
      <div class="toolbar"><button class="btn btn-primary" id="retryQuiz">تکرار همین آزمون</button><button class="btn btn-secondary" id="goProgress">مشاهدهٔ عملکرد</button><button class="btn btn-quiet" id="goExams">بازگشت به آزمون‌ها</button></div>
      <div class="section-head"><div><h2>تحلیل سؤال‌به‌سؤال</h2><p>پاسخ صحیح و روش حل هر سؤال در زیر آمده است.</p></div></div>
      <div class="question-list">${qs.map((q,i)=>questionCard(q,i,{disabled:true,showSolution:true,results})).join('')}</div>`;
    $('#retryQuiz').addEventListener('click',()=>startQuiz(attempt.title,qs,Math.max(8,Math.ceil(qs.length*1.5))));
    $('#goProgress').addEventListener('click',()=>setView('progress'));
    $('#goExams').addEventListener('click',()=>setView('exams'));
  }

  function renderBank(){
    pageTitle('بانک سؤال');
    const ids=state.selectedChapters.length?state.selectedChapters:DATA.chapters.map(c=>c.id);
    root.innerHTML=`<div class="page-intro"><div class="kicker">بانک تمرین · پاسخ تشریحی</div><h1>بانک سؤال همهٔ فصل‌ها</h1><p>فصل‌ها را از ستون کناری انتخاب کن. سؤال را حل کن و سپس راه‌حل را ببین؛ در آزمون‌ها پاسخ‌ها تا پایان مخفی می‌مانند.</p></div>
      <div class="toolbar"><input class="search-input" id="bankSearch" placeholder="جست‌وجوی مبحث یا متن سؤال..."><select class="select" id="bankChapter"><option value="all">همهٔ فصل‌های انتخاب‌شده</option>${DATA.chapters.filter(c=>ids.includes(c.id)).map(c=>`<option value="${c.id}">فصل ${faNum(c.id)} · ${esc(c.title)}</option>`).join('')}</select><select class="select" id="bankType"><option value="all">همهٔ نوع‌ها</option><option value="choice">چهارگزینه‌ای</option><option value="input">پاسخ کوتاه</option><option value="boolean">درست/نادرست</option></select><select class="select" id="bankDiff"><option value="all">همهٔ سطح‌ها</option><option value="1">آسان</option><option value="2">متوسط</option><option value="3">چالشی</option></select></div>
      <div class="bank-summary" id="bankSummary"></div><div class="question-list" id="bankQuestions"></div>`;
    const search=$('#bankSearch'), ch=$('#bankChapter'), typ=$('#bankType'), diff=$('#bankDiff');
    function update(){
      let qs=DATA.questions.filter(q=>ids.includes(q.ch));
      if(ch.value!=='all')qs=qs.filter(q=>q.ch===Number(ch.value));
      if(typ.value!=='all')qs=qs.filter(q=>q.type===typ.value);
      if(diff.value!=='all')qs=qs.filter(q=>q.diff===Number(diff.value));
      if(search.value.trim()){const term=normalize(search.value);qs=qs.filter(q=>normalize(q.q+' '+q.tag+' '+q.solution).includes(term));}
      $('#bankSummary').innerHTML=`<span>${faNum(qs.length)} سؤال پیدا شد</span><span>${faNum(ids.length)} فصل فعال</span>`;
      $('#bankQuestions').innerHTML=qs.length?qs.map((q,i)=>questionCard(q,i,{bank:true,showSolution:revealed.has(q.id)})).join(''):'<div class="empty"><span class="empty-icon">⌕</span>سؤالی با این فیلتر پیدا نشد.</div>';
      $$('#bankQuestions input[name^="bank-"]').forEach(el=>el.addEventListener('change',()=>{const id=el.name.slice(5);bankAnswers[id]=el.value;}));
      $$('#bankQuestions [data-bank-answer]').forEach(el=>el.addEventListener('input',()=>{bankAnswers[el.dataset.bankAnswer]=el.value;}));
      $$('[data-check-bank]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.checkBank;const q=DATA.questions.find(x=>x.id===id);if(!String(bankAnswers[id]??'').trim()){toast('اول پاسخ خودت را وارد یا انتخاب کن.');return;}bankResults[id]={correct:isCorrect(q,bankAnswers[id])};revealed.add(id);update();}));
    }
    [search,ch,typ,diff].forEach(el=>el.addEventListener('input',update));
    update();
  }

  function renderVideos(){
    pageTitle('فیلم‌های آموزشی');
    root.innerHTML=`<div class="page-intro"><div class="kicker">یادگیری تصویری</div><h1>فیلم‌های آموزشی فصل‌های ۱ و ۲</h1><p>پیوندها به ویدیوهای بیرونی باز می‌شوند؛ دسترسی و موجود بودن ویدیو ممکن است توسط میزبان تغییر کند.</p></div>
      <div class="video-grid">${DATA.videos.map(v=>`<article class="video-card"><div class="video-cover">▷</div><span class="question-tag">فصل ${faNum(v.ch)}</span><h3>${esc(v.title)}</h3><p>${esc(v.desc)}</p><div class="video-meta">${esc(v.by)} · ${esc(v.duration)}</div><a class="btn btn-primary" href="${esc(v.url)}" target="_blank" rel="noopener">مشاهده در YouTube ↗</a></article>`).join('')}</div>
      <div class="callout" style="margin-top:16px">در اپ، ویدیوها به‌صورت لینک قرار گرفته‌اند تا برنامه سبک و آفلاین‌پذیر بماند. برای فصل‌های ۳ تا ۹ هنوز ویدیوی تأییدشده‌ای به این بسته اضافه نشده است.</div>`;
  }

  function renderBook(){
    pageTitle('کتاب PDF');
    root.innerHTML=`<div class="page-intro"><div class="kicker">کتاب درسی اصلی</div><h1>نمایش کتاب ریاضی هشتم</h1><p>فایل PDF را از حافظهٔ دستگاه انتخاب کن تا در همین صفحه باز شود. برای انتشار برنامه بین دوستان، فقط نسخه‌ای از PDF را قرار بده که اجازهٔ بازنشر آن را داری.</p></div>
      <div class="book-layout"><aside class="book-panel"><div class="stat-icon" style="margin-bottom:12px">▧</div><h3>کتاب ریاضی پایه هشتم</h3><p>فایل بارگذاری‌شده در این گفت‌وگو، ۱۶۰ صفحه دارد و چاپ یازدهم سال ۱۴۰۳ است. این برنامه فایل کتاب را داخل بستهٔ عمومی کپی نکرده؛ می‌توانی نسخهٔ مجاز خودت را بارگذاری کنی.</p><button class="btn btn-primary" id="choosePdf">انتخاب فایل PDF</button><button class="btn btn-quiet" id="clearPdf" style="margin-top:8px">بستن کتاب</button><div class="callout">راه دیگر: اگر حق توزیع PDF را داری، آن را با نام <code dir="ltr">riazi8.pdf</code> داخل پوشهٔ <code dir="ltr">assets</code> بگذار و سپس پیوند آن را در نسخهٔ خودت فعال کن.</div><div id="pdfStatus" class="bank-summary">هنوز فایلی انتخاب نشده است.</div></aside><section class="pdf-view" id="pdfView"><div class="pdf-placeholder"><div class="big">▤</div><strong>کتاب هنوز باز نشده</strong><span>از دکمهٔ «انتخاب فایل PDF» استفاده کن.</span></div></section></div>`;
    $('#choosePdf').addEventListener('click',()=>$('#pdfPicker').click());
    $('#clearPdf').addEventListener('click',()=>{if(window._pdfUrl)URL.revokeObjectURL(window._pdfUrl);window._pdfUrl=null;$('#pdfView').innerHTML='<div class="pdf-placeholder"><div class="big">▤</div><strong>کتاب بسته شد</strong></div>';$('#pdfStatus').textContent='فایلی انتخاب نشده است.';});
  }
  $('#pdfPicker').addEventListener('change',e=>{
    const f=e.target.files?.[0];if(!f)return;
    if(f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf')){toast('لطفاً یک فایل PDF انتخاب کن.');return;}
    if(window._pdfUrl)URL.revokeObjectURL(window._pdfUrl);
    window._pdfUrl=URL.createObjectURL(f);
    $('#pdfView').innerHTML=`<iframe title="کتاب ریاضی هشتم" src="${window._pdfUrl}#toolbar=1&navpanes=0"></iframe>`;
    $('#pdfStatus').textContent=`فایل باز شد: ${f.name} · ${(f.size/1024/1024).toFixed(1)} MB`;
    toast('PDF با موفقیت باز شد.');
  });

  function renderProgress(){
    pageTitle('عملکرد من');
    const totalLessons=DATA.chapters.reduce((s,c)=>s+c.lessons.length,0);
    const overall=Math.round(state.lessonChecks.length/totalLessons*100);
    const attempts=state.attempts;
    const avg=attempts.length?Math.round(attempts.reduce((s,a)=>s+a.score,0)/attempts.length):0;
    const best=attempts.length?Math.max(...attempts.map(a=>a.score)):0;
    root.innerHTML=`<div class="page-intro"><div class="kicker">پیشرفت ذخیره‌شده روی همین دستگاه</div><h1>عملکرد و نقاط ضعف</h1><p>نمره‌ها، درس‌های خوانده‌شده و کارت‌هایی که نیاز به مرور دارند در حافظهٔ مرورگر ثبت می‌شوند؛ با عوض کردن دستگاه منتقل نمی‌شوند.</p></div>
      <div class="stats-grid"><div class="stat-card"><div><div class="stat-label">پیشرفت درس‌ها</div><div class="stat-value">${faNum(overall)}٪</div></div><div class="stat-icon">◔</div></div><div class="stat-card"><div><div class="stat-label">میانگین آزمون</div><div class="stat-value">${faNum(avg)}٪</div></div><div class="stat-icon">∿</div></div><div class="stat-card"><div><div class="stat-label">بهترین نمره</div><div class="stat-value">${faNum(best)}٪</div></div><div class="stat-icon">★</div></div><div class="stat-card"><div><div class="stat-label">کارت‌های بلد هستم</div><div class="stat-value">${faNum(state.mastered.length)}</div></div><div class="stat-icon">✓</div></div></div>
      <div class="split-grid"><section class="panel"><h3>پیشرفت درس‌ها به تفکیک فصل</h3><div class="progress-bars">${DATA.chapters.map(c=>{const done=c.lessons.filter((l,i)=>state.lessonChecks.includes(`${c.id}-${i}`)).length;const pct=Math.round(done/c.lessons.length*100);return `<div class="progress-row"><span>فصل ${faNum(c.id)} · ${esc(c.title)}</span><div class="bar"><span style="width:${pct}%"></span></div><b>${faNum(pct)}٪</b></div>`;}).join('')}</div><div class="callout">${faNum(state.lessonChecks.length)} درس از ${faNum(totalLessons)} درس علامت‌گذاری شده است.</div></section>
      <section class="panel"><h3>موارد نیازمند مرور</h3><p style="font-size:11px;color:var(--muted);line-height:2">${state.needsWork.length?`تعداد ${faNum(state.needsWork.length)} کارت در فهرست تمرین مجدد قرار دارد.`:'فعلاً کارتی را برای مرور مجدد علامت نزده‌ای.'}</p><button class="btn btn-secondary btn-small" id="reviewCards">باز کردن کارت‌های حفظی</button><div style="margin-top:13px"><h3>آخرین آزمون</h3>${attempts.length?`<div class="attempt-row"><div><strong>${esc(attempts[0].title)}</strong><small>${new Date(attempts[0].date).toLocaleString('fa-IR')}</small></div><span class="attempt-score">${faNum(attempts[0].score)}٪</span></div>`:'<div class="empty">هنوز آزمونی ثبت نشده است.</div>'}</div></section></div>
      <div class="section-head"><div><h2>تاریخچهٔ آزمون‌ها</h2><p>آزمون‌های اخیر به ترتیب جدیدترین نمایش داده می‌شوند.</p></div></div>
      <section class="panel">${attempts.length?attempts.slice(0,20).map(a=>`<div class="attempt-row"><div><strong>${esc(a.title)}</strong><small>${new Date(a.date).toLocaleString('fa-IR')} · ${faNum(a.correct)} از ${faNum(a.total)} درست</small></div><span class="attempt-score">${faNum(a.score)}٪</span></div>`).join(''):'<div class="empty"><span class="empty-icon">◈</span>برای دیدن کارنامه، یکی از آزمون‌ها را انجام بده.</div>'}</section>
      <div class="danger-zone"><span>پاک کردن پیشرفت، نمره‌ها و علامت درس‌ها از همین مرورگر</span><button class="btn btn-quiet btn-small" id="resetProgress">پاک کردن اطلاعات</button></div>`;
    $('#reviewCards').addEventListener('click',()=>setView('memorise'));
    $('#resetProgress').addEventListener('click',()=>{if(confirm('تمام نمره‌ها و پیشرفت ذخیره‌شده پاک شود؟')){state={...defaultState,activeView:'progress'};saveState();renderProgress();toast('اطلاعات پیشرفت پاک شد.');}});
  }

  // Small delegated actions that are present in some view templates.
  document.addEventListener('click',e=>{
    if(e.target.closest('#practiceChapter')){
      if(!state.selectedChapters.includes(activeChapter)) state.selectedChapters=[...state.selectedChapters,activeChapter];
      saveState(); setView('bank');
      setTimeout(()=>{const ch=$('#bankChapter');if(ch){ch.value=String(activeChapter);ch.dispatchEvent(new Event('input'));}},0);
    }
  });

  // PWA install prompt.
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn').hidden=false;});
  $('#installBtn').addEventListener('click',async()=>{
    if(!deferredInstall){toast('برای نصب، برنامه را از نشانی HTTPS در مرورگر باز کن.');return;}
    deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBtn').hidden=true;
  });
  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }

  render();
})();
