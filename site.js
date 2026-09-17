// 사이드바 열고 닫기 (모바일)
const side=document.querySelector('.side'), scrim=document.querySelector('.scrim');
function toggleSide(on){ side.classList.toggle('open',on); scrim.classList.toggle('on',on); }
document.querySelector('.top .menu')?.addEventListener('click',()=>toggleSide(!side.classList.contains('open')));
scrim?.addEventListener('click',()=>toggleSide(false));

// 다크/라이트 전환 (기본은 기기 설정을 따름)
const tbtn=document.querySelector('.top .theme');
function curTheme(){ const t=document.documentElement.dataset.theme; if(t) return t; return matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'; }
function paintTheme(){ if(tbtn) tbtn.textContent=curTheme()==='dark'?'☀︎':'☾'; }
tbtn?.addEventListener('click',()=>{ const n=curTheme()==='dark'?'light':'dark'; document.documentElement.dataset.theme=n; try{localStorage.setItem('dalbit-theme',n);}catch(e){} paintTheme(); });
paintTheme();

// 코드 상자 복사 버튼
document.querySelectorAll('pre').forEach(pre=>{
  const b=document.createElement('button'); b.className='copy'; b.textContent='복사';
  b.onclick=()=>{ navigator.clipboard.writeText(pre.innerText.replace(/^복사\n?/,'').replace(/\n?복사됨 ✓$/,'')).then(()=>{ b.textContent='복사됨 ✓'; setTimeout(()=>b.textContent='복사',1500); }); };
  pre.appendChild(b);
});
