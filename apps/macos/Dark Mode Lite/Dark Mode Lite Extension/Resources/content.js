var e=[{id:`default`,name:`Default`,mode:`smart`,brightness:100,contrast:92,sepia:0,dot:`#2FE0CE`,builtin:!0},{id:`reading`,name:`Reading`,mode:`soft`,brightness:96,contrast:88,sepia:18,dot:`#7C8CF8`,builtin:!0},{id:`night-owl`,name:`Night Owl`,mode:`smart`,brightness:78,contrast:100,sepia:0,dot:`#B084F5`,builtin:!0}],t={enabled:!0,mode:`smart`,brightness:100,contrast:92,sepia:0,settingsVersion:3,siteOverrides:{},customPresets:[],activePresetId:`default`},n=`dark-mode-lite`,r=class r{static normalizeHost(e){return e.trim().toLowerCase().replace(/^www\./,``)}static parseThemeMode(e){return e===`smart`||e===`invert`||e===`soft`?e:t.mode}static parseThemePreset(e){if(!r.isRecord(e)||typeof e.id!=`string`||e.id.length===0)return null;let n=r.parseNumberInRange(e.brightness,50,150),i=r.parseNumberInRange(e.contrast,50,150),a=r.parseNumberInRange(e.sepia,0,100);return{id:e.id,name:typeof e.name==`string`&&e.name.length>0?e.name:e.id,mode:r.parseThemeMode(e.mode),brightness:n??t.brightness,contrast:i??t.contrast,sepia:a??t.sepia,dot:typeof e.dot==`string`&&e.dot.length>0?e.dot:`#2FE0CE`,builtin:!1}}static parseSettingsPatch(e){if(!r.isRecord(e))return{};let t={};typeof e.enabled==`boolean`&&(t.enabled=e.enabled),typeof e.mode==`string`&&(t.mode=r.parseThemeMode(e.mode));let n=r.parseNumberInRange(e.brightness,50,150);n!==void 0&&(t.brightness=n);let i=r.parseNumberInRange(e.contrast,50,150);i!==void 0&&(t.contrast=i);let a=r.parseNumberInRange(e.sepia,0,100);a!==void 0&&(t.sepia=a);let o=r.parseFiniteNumber(e.settingsVersion);o!==void 0&&(t.settingsVersion=o);let s=r.parseSiteOverrides(e.siteOverrides);s!==void 0&&(t.siteOverrides=s);let c=r.parseCustomPresets(e.customPresets);return c!==void 0&&(t.customPresets=c),`activePresetId`in e&&(t.activePresetId=r.parseActivePresetId(e.activePresetId)),t}static parseSettings(n){let i=r.parseSettingsPatch(n),a={...t,...i,siteOverrides:{...t.siteOverrides,...i.siteOverrides??{}}};r.isLegacyInvertSettings(n)&&(a.mode=`smart`),a.settingsVersion=t.settingsVersion;let o=new Set([...e.map(e=>e.id),...a.customPresets.map(e=>e.id)]);return a.activePresetId!==null&&!o.has(a.activePresetId)&&(a.activePresetId=null),a}static migrateSettings(e){return r.parseSettings(e)}static parseExtensionState(e){if(!r.isRecord(e))return null;let t=r.parseSettings(e.settings),n=typeof e.host==`string`?r.normalizeHost(e.host):``,i=typeof e.siteEnabled==`boolean`?e.siteEnabled:t.siteOverrides[n]??!0;return{settings:t,host:n,active:typeof e.active==`boolean`?e.active:!!(t.enabled&&i),siteEnabled:i}}static parsePopupMessage(e){return!r.isRecord(e)||e.source!==`dark-mode-lite`?null:e.type===`get-state`?{source:n,type:`get-state`}:e.type===`toggle-site`?{source:n,type:`toggle-site`}:e.type===`set-settings`?{source:n,type:`set-settings`,patch:r.parseSettingsPatch(e.patch)}:null}static isRecord(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}static parseFiniteNumber(e){if(!(typeof e!=`number`||!Number.isFinite(e)))return e}static parseNumberInRange(e,t,n){let i=r.parseFiniteNumber(e);if(i!==void 0)return Math.min(n,Math.max(t,i))}static parseSiteOverrides(e){if(!r.isRecord(e))return;let t={};for(let n of Object.keys(e).sort()){let i=e[n],a=r.normalizeHost(n);typeof i==`boolean`&&a.length>0&&(t[a]=i)}return t}static parseCustomPresets(e){if(!Array.isArray(e))return;let t=new Set,n=[];for(let i of e){let e=r.parseThemePreset(i);e&&!t.has(e.id)&&(t.add(e.id),n.push(e))}return n}static parseActivePresetId(e){return typeof e==`string`&&e.length>0?e:null}static isLegacyInvertSettings(e){return r.isRecord(e)?!r.parseFiniteNumber(e.settingsVersion)&&e.mode===`invert`:!1}},i={styleId:`dark-mode-lite-style`,rootAttribute:`data-dm-lite-active`,modeAttribute:`data-dm-lite-mode`},a=class e{static LEGACY_STYLE_ID=`personal-dark-mode-lite-style`;static LEGACY_ROOT_ATTR=`data-pdm-lite-active`;static LEGACY_MODE_ATTR=`data-pdm-lite-mode`;static SKIPPABLE_TAGS=[`SCRIPT`,`STYLE`,`META`,`LINK`,`NOSCRIPT`,`IMG`,`VIDEO`,`PICTURE`,`CANVAS`,`SVG`,`PATH`,`IFRAME`];settings=null;active=!1;smartObserver=null;smartScanTimer=0;originalStyles=new Map;apply(e,t){let n=this.settings?.mode,a=r.migrateSettings(e);this.settings=a,this.active=t;let o=document.documentElement;this.cleanupLegacyNamespace(o);let s=this.ensureStyle(),c=this.normalizeMode(a.mode);s.textContent=this.createCSS(a),o.setAttribute(i.modeAttribute,c),n===`smart`&&(!t||c!==`smart`)&&this.stopSmartMode(),t?(o.setAttribute(i.rootAttribute,`true`),c===`smart`&&this.startSmartMode()):(o.removeAttribute(i.rootAttribute),this.stopSmartMode())}dispose(){this.active=!1,this.stopSmartMode();let e=document.documentElement;e.removeAttribute(i.rootAttribute),e.removeAttribute(i.modeAttribute),document.getElementById(i.styleId)?.remove(),this.cleanupLegacyNamespace(e),this.settings=null}normalizeMode(e){return e===`smart`||e===`invert`||e===`soft`?e:`smart`}clamp(e,t,n){let r=Number(e);return Number.isFinite(r)?Math.min(n,Math.max(t,r)):t}parseColor(e){let t=String(e).match(/rgba?\(([^)]+)\)/)?.[1];if(!t)return null;let n=t.split(`,`).map(e=>Number.parseFloat(e.trim())),r=n[0],i=n[1],a=n[2],o=n[3]??1;return r===void 0||i===void 0||a===void 0||![r,i,a,o].every(Number.isFinite)||o===0?null:{r,g:i,b:a,a:o}}luminance(e){let t=e=>{let t=e/255;return t<=.03928?t/12.92:((t+.055)/1.055)**2.4};return .2126*t(e.r)+.7152*t(e.g)+.0722*t(e.b)}rememberStyle(e,t){let n=this.originalStyles.get(e);n||(n={},this.originalStyles.set(e,n)),Object.hasOwn(n,t)||(n[t]={value:e.style.getPropertyValue(t),priority:e.style.getPropertyPriority(t)})}setImportant(e,t,n){this.rememberStyle(e,t),e.style.setProperty(t,n,`important`)}restoreSmartStyles(){for(let[e,t]of this.originalStyles)if(e.style)for(let[n,r]of Object.entries(t))r.value?e.style.setProperty(n,r.value,r.priority):e.style.removeProperty(n);this.originalStyles.clear()}isSkippableElement(t){return e.SKIPPABLE_TAGS.includes(t.tagName)}smartenElement(e){if(!(e instanceof HTMLElement)||this.isSkippableElement(e))return;let t=getComputedStyle(e),n=this.parseColor(t.backgroundColor),r=this.parseColor(t.color);if(e===document.body||e===document.documentElement){this.setImportant(e,`background-color`,`#111318`),this.setImportant(e,`color`,`#e9edf5`);return}if(n){let t=this.luminance(n);t>.78?this.setImportant(e,`background-color`,`#171b22`):t>.58&&this.setImportant(e,`background-color`,`#202632`)}if(r){let t=this.luminance(r);e.closest(`a`)?this.setImportant(e,`color`,`#8ab4ff`):t<.42&&this.setImportant(e,`color`,`#e9edf5`)}for(let n of[`top`,`right`,`bottom`,`left`]){let r=`border-${n}-color`,i=this.parseColor(t.getPropertyValue(r));i&&this.luminance(i)>.52&&this.setImportant(e,r,`rgba(255, 255, 255, 0.18)`)}}scanSmartMode(){if(this.smartScanTimer=0,!this.active||this.settings?.mode!==`smart`)return;let e=[document.documentElement,document.body,...document.querySelectorAll(`body *`)];for(let t=0;t<e.length&&t<5e3;t+=1){let n=e[t];n&&this.smartenElement(n)}}scheduleSmartScan(){this.smartScanTimer||=window.setTimeout(()=>this.scanSmartMode(),80)}startSmartMode(){this.scheduleSmartScan(),!this.smartObserver&&(this.smartObserver=new MutationObserver(()=>this.scheduleSmartScan()),this.smartObserver.observe(document.documentElement,{childList:!0,subtree:!0}))}stopSmartMode(){this.smartObserver&&=(this.smartObserver.disconnect(),null),this.smartScanTimer&&=(window.clearTimeout(this.smartScanTimer),0),this.restoreSmartStyles()}cleanupLegacyNamespace(t=document.documentElement){document.getElementById(e.LEGACY_STYLE_ID)?.remove(),t.removeAttribute(e.LEGACY_ROOT_ATTR),t.removeAttribute(e.LEGACY_MODE_ATTR)}ensureStyle(){let e=document.getElementById(i.styleId);if(e instanceof HTMLStyleElement)return e;let t=document.createElement(`style`);return t.id=i.styleId,t.setAttribute(`data-owner`,`dark-mode-lite`),(document.documentElement||document.head||document).appendChild(t),t}createCSS(e){let t=this.clamp(e.brightness,50,150),n=this.clamp(e.contrast,50,150),r=this.clamp(e.sepia,0,100),a=i.rootAttribute,o=i.modeAttribute;return`
      html[${a}="true"] {
        color-scheme: dark !important;
        --dm-lite-bg: #111318;
        --dm-lite-surface: #1a1d24;
        --dm-lite-surface-2: #232833;
        --dm-lite-text: #e9edf5;
        --dm-lite-muted: #aab2c2;
        --dm-lite-link: #8ab4ff;
        --dm-lite-border: rgba(255, 255, 255, 0.22);
      }

      html[${a}="true"][${o}="smart"],
      html[${a}="true"][${o}="smart"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${a}="true"][${o}="smart"] :where(
        p, span, li, label, strong, em, small, h1, h2, h3, h4, h5, h6,
        code, pre, th, td
      ) {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${a}="true"][${o}="smart"] :where(a, a *) {
        color: var(--dm-lite-link) !important;
      }

      html[${a}="true"][${o}="smart"] :where(
        [style*="background: white"],
        [style*="background:white"],
        [style*="background-color: white"],
        [style*="background-color:white"],
        [style*="background: rgb(255"],
        [style*="background-color: rgb(255"]
      ) {
        background: var(--dm-lite-bg) !important;
        background-color: var(--dm-lite-bg) !important;
      }

      html[${a}="true"][${o}="smart"] img,
      html[${a}="true"][${o}="smart"] video,
      html[${a}="true"][${o}="smart"] picture,
      html[${a}="true"][${o}="smart"] canvas,
      html[${a}="true"][${o}="smart"] svg,
      html[${a}="true"][${o}="smart"] iframe {
        filter: brightness(${t}%) contrast(${n}%) sepia(${r}%) !important;
      }

      html[${a}="true"][${o}="smart"] input,
      html[${a}="true"][${o}="smart"] textarea,
      html[${a}="true"][${o}="smart"] select,
      html[${a}="true"][${o}="smart"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${a}="true"][${o}="invert"] {
        background: white !important;
        filter: invert(1) hue-rotate(180deg) brightness(${t}%) contrast(${n}%) sepia(${r}%) !important;
      }

      html[${a}="true"][${o}="invert"] img,
      html[${a}="true"][${o}="invert"] video,
      html[${a}="true"][${o}="invert"] picture,
      html[${a}="true"][${o}="invert"] canvas,
      html[${a}="true"][${o}="invert"] iframe,
      html[${a}="true"][${o}="invert"] svg,
      html[${a}="true"][${o}="invert"] [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }

      html[${a}="true"][${o}="soft"],
      html[${a}="true"][${o}="soft"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${a}="true"][${o}="soft"] body,
      html[${a}="true"][${o}="soft"] main,
      html[${a}="true"][${o}="soft"] article,
      html[${a}="true"][${o}="soft"] section,
      html[${a}="true"][${o}="soft"] aside,
      html[${a}="true"][${o}="soft"] header,
      html[${a}="true"][${o}="soft"] footer,
      html[${a}="true"][${o}="soft"] nav,
      html[${a}="true"][${o}="soft"] div,
      html[${a}="true"][${o}="soft"] form,
      html[${a}="true"][${o}="soft"] dialog {
        background-color: var(--dm-lite-bg) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${a}="true"][${o}="soft"] p,
      html[${a}="true"][${o}="soft"] span,
      html[${a}="true"][${o}="soft"] li,
      html[${a}="true"][${o}="soft"] label,
      html[${a}="true"][${o}="soft"] strong,
      html[${a}="true"][${o}="soft"] em,
      html[${a}="true"][${o}="soft"] h1,
      html[${a}="true"][${o}="soft"] h2,
      html[${a}="true"][${o}="soft"] h3,
      html[${a}="true"][${o}="soft"] h4,
      html[${a}="true"][${o}="soft"] h5,
      html[${a}="true"][${o}="soft"] h6,
      html[${a}="true"][${o}="soft"] code,
      html[${a}="true"][${o}="soft"] pre,
      html[${a}="true"][${o}="soft"] table,
      html[${a}="true"][${o}="soft"] th,
      html[${a}="true"][${o}="soft"] td {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${a}="true"][${o}="soft"] a {
        color: var(--dm-lite-link) !important;
      }

      html[${a}="true"][${o}="soft"] input,
      html[${a}="true"][${o}="soft"] textarea,
      html[${a}="true"][${o}="soft"] select,
      html[${a}="true"][${o}="soft"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${a}="true"][${o}="soft"] input::placeholder,
      html[${a}="true"][${o}="soft"] textarea::placeholder {
        color: var(--dm-lite-muted) !important;
      }

      html[${a}="true"][${o}="soft"] pre,
      html[${a}="true"][${o}="soft"] code,
      html[${a}="true"][${o}="soft"] blockquote {
        background-color: var(--dm-lite-surface-2) !important;
      }
    `}},o=`dark-mode-lite-controller`,s=class{engine=new a;start(){chrome.runtime.onMessage.addListener(e=>this.handleMessage(e)),chrome.runtime.sendMessage({source:o,type:`ready`},()=>void chrome.runtime.lastError)}handleMessage(e){let t=this.parseCommand(e);if(!t)return!1;if(t.type===`dispose`)return this.engine.dispose(),!1;let n=r.migrateSettings(t.settings);return this.engine.apply(n,t.active),!1}parseCommand(e){if(typeof e!=`object`||!e||Array.isArray(e))return null;let t=e;return t.source===o?t.type===`dispose`?{source:o,type:`dispose`}:t.type===`apply`&&typeof t.active==`boolean`?{source:o,type:`apply`,settings:t.settings,active:t.active}:null:null}};(()=>{let e=globalThis;(e.__DARK_MODE_LITE_CONTROLLER_LOADED__||0)>=1||(e.__DARK_MODE_LITE_CONTROLLER_LOADED__=1,new s().start())})();