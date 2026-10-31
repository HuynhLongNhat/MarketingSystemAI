(function(){"use strict";const b={WIDGET_URL:"http://localhost:3001",DEFAULT_POSITION:"bottom-right"},x=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,k=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;(function(){var L;const m=window;if(m.EchoWidget)return;const o=document.currentScript;o!=null&&o.src&&new URL(o.src);const y=b.WIDGET_URL.replace(/\/$/,""),T=new URL(y).origin;let l=((L=o==null?void 0:o.getAttribute("data-organization-id"))==null?void 0:L.trim())||null,u=(o==null?void 0:o.getAttribute("data-position"))==="bottom-left"?"bottom-left":b.DEFAULT_POSITION,n=null,t=null,e=null,r=!1,s=!1,d=null;function I(){const i=new URL(y);return l&&i.searchParams.set("organizationId",l),i.toString()}function h(){d!==null&&(window.clearTimeout(d),d=null)}function g(){if(!(s||e||t)){if(!l){console.error("Echo Widget: data-organization-id attribute is required");return}e=document.createElement("button"),e.id="echo-widget-button",e.type="button",e.setAttribute("aria-label","Mở hỗ trợ khách hàng"),e.setAttribute("aria-expanded","false"),e.innerHTML=x,e.style.cssText=`
      position: fixed;
      ${u==="bottom-left"?"left: 20px;":"right: 20px;"}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(59, 130, 246, 0.35);
      transition: transform 0.2s ease;
    `,e.addEventListener("click",M),e.addEventListener("mouseenter",()=>{e&&(e.style.transform="scale(1.05)")}),e.addEventListener("mouseleave",()=>{e&&(e.style.transform="scale(1)")}),t=document.createElement("div"),t.id="echo-widget-container",t.style.cssText=`
      position: fixed;
      ${u==="bottom-left"?"left: 20px;":"right: 20px;"}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `,n=document.createElement("iframe"),n.src=I(),n.title="Hỗ trợ khách hàng",n.setAttribute("loading","lazy"),n.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    `,n.allow="microphone; clipboard-read; clipboard-write",t.appendChild(n),document.body.appendChild(e),document.body.appendChild(t),window.addEventListener("message",p)}}function v(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",g,{once:!0}):g()}function p(i){if(i.origin!==T||i.source!==(n==null?void 0:n.contentWindow)||!i.data||typeof i.data!="object")return;const{type:f,payload:c}=i.data;switch(f){case"close":w();break;case"resize":{if(!t)break;const a=Number(c==null?void 0:c.height);if(!Number.isFinite(a)||a<=0)break;const O=Math.min(Math.max(a,200),window.innerHeight-110);t.style.height=`${Math.max(100,O)}px`;break}}}function E(){!t||!e||s||(h(),r=!0,t.style.display="block",window.requestAnimationFrame(()=>{!t||!r||(t.style.opacity="1",t.style.transform="translateY(0)")}),e.innerHTML=k,e.setAttribute("aria-label","Đóng hỗ trợ khách hàng"),e.setAttribute("aria-expanded","true"))}function w(){!t||!e||s||(h(),r=!1,t.style.opacity="0",t.style.transform="translateY(10px)",e.innerHTML=x,e.setAttribute("aria-label","Mở hỗ trợ khách hàng"),e.setAttribute("aria-expanded","false"),d=window.setTimeout(()=>{t&&!r&&(t.style.display="none"),d=null},300))}function M(){r?w():E()}function z(){s=!0,h(),document.removeEventListener("DOMContentLoaded",g),window.removeEventListener("message",p),e==null||e.remove(),t==null||t.remove(),e=null,t=null,n=null,r=!1,delete m.EchoWidget}function A(i={}){var a;const f=((a=i.organizationId)==null?void 0:a.trim())||l;if(!f){console.error("Echo Widget: organizationId is required");return}const c=i.position==="bottom-left"?"bottom-left":"bottom-right";h(),document.removeEventListener("DOMContentLoaded",g),window.removeEventListener("message",p),e==null||e.remove(),t==null||t.remove(),e=null,t=null,n=null,r=!1,s=!1,l=f,u=i.position?c:u,v()}m.EchoWidget={init:A,show:E,hide:w,destroy:z},v()})()})();
