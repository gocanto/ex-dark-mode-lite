var e=class e{static MESSAGE_SOURCE=`dark-mode-lite`;static STYLE_ID=`dark-mode-lite-style`;static LEGACY_STYLE_ID=`personal-dark-mode-lite-style`;static ROOT_ATTR=`data-dm-lite-active`;static MODE_ATTR=`data-dm-lite-mode`;static LEGACY_ROOT_ATTR=`data-pdm-lite-active`;static LEGACY_MODE_ATTR=`data-pdm-lite-mode`;static SKIPPABLE_TAGS=[`SCRIPT`,`STYLE`,`META`,`LINK`,`NOSCRIPT`,`IMG`,`VIDEO`,`PICTURE`,`CANVAS`,`SVG`,`PATH`,`IFRAME`];static DEFAULT_SETTINGS={enabled:!0,mode:`smart`,brightness:100,contrast:92,sepia:0,settingsVersion:3,siteOverrides:{},customPresets:[],activePresetId:`default`};settings={...e.DEFAULT_SETTINGS};smartObserver=null;smartScanTimer=0;originalStyles=new Map;start(){chrome.runtime.onMessage.addListener((e,t,n)=>this.handleMessage(e,n)),chrome.storage.onChanged.addListener((e,t)=>this.handleStorageChanged(e,t)),this.readSettings()}handleMessage(e,t){let n=this.parsePopupMessage(e);if(!n)return!1;if(n.type===`get-state`)return t(this.getState()),!1;if(n.type===`set-settings`)return this.updateSettings(n.patch||{},t),!0;if(n.type===`toggle-site`){let e=this.getHost(),n={...this.settings.siteOverrides,[e]:!this.getSiteState(this.settings)};return this.updateSettings({siteOverrides:n},t),!0}return!1}handleStorageChanged(e,t){if(t!==`sync`)return;let n={...this.settings};for(let[t,r]of Object.entries(e))n[t]=r.newValue;this.applySettings(n)}normalizeHost(e){return e.replace(/^www\./,``)}getHost(){return this.normalizeHost(location.hostname||``)}getSiteState(e=this.settings){let t=this.getHost();return e.siteOverrides?.[t]??!0}isActive(e=this.settings){return!!(e.enabled&&this.getSiteState(e))}clamp(e,t,n){let r=Number(e);return Number.isFinite(r)?Math.min(n,Math.max(t,r)):t}parseColor(e){let t=String(e).match(/rgba?\(([^)]+)\)/)?.[1];if(!t)return null;let n=t.split(`,`).map(e=>Number.parseFloat(e.trim())),r=n[0],i=n[1],a=n[2],o=n[3]??1;return r===void 0||i===void 0||a===void 0||![r,i,a,o].every(Number.isFinite)||o===0?null:{r,g:i,b:a,a:o}}luminance(e){let t=e=>{let t=e/255;return t<=.03928?t/12.92:((t+.055)/1.055)**2.4};return .2126*t(e.r)+.7152*t(e.g)+.0722*t(e.b)}rememberStyle(e,t){let n=this.originalStyles.get(e);n||(n={},this.originalStyles.set(e,n)),Object.hasOwn(n,t)||(n[t]={value:e.style.getPropertyValue(t),priority:e.style.getPropertyPriority(t)})}setImportant(e,t,n){this.rememberStyle(e,t),e.style.setProperty(t,n,`important`)}restoreSmartStyles(){for(let[e,t]of this.originalStyles)if(e?.style)for(let[n,r]of Object.entries(t))r.value?e.style.setProperty(n,r.value,r.priority):e.style.removeProperty(n);this.originalStyles.clear()}isSkippableElement(t){return e.SKIPPABLE_TAGS.includes(t.tagName)}smartenElement(e){if(!(e instanceof HTMLElement)||this.isSkippableElement(e))return;let t=getComputedStyle(e),n=this.parseColor(t.backgroundColor),r=this.parseColor(t.color);if(e===document.body||e===document.documentElement){this.setImportant(e,`background-color`,`#111318`),this.setImportant(e,`color`,`#e9edf5`);return}if(n){let t=this.luminance(n);t>.78?this.setImportant(e,`background-color`,`#171b22`):t>.58&&this.setImportant(e,`background-color`,`#202632`)}if(r){let t=this.luminance(r);e.closest(`a`)?this.setImportant(e,`color`,`#8ab4ff`):t<.42&&this.setImportant(e,`color`,`#e9edf5`)}for(let n of[`top`,`right`,`bottom`,`left`]){let r=`border-${n}-color`,i=this.parseColor(t.getPropertyValue(r));i&&this.luminance(i)>.52&&this.setImportant(e,r,`rgba(255, 255, 255, 0.18)`)}}scanSmartMode(){if(this.smartScanTimer=0,!this.isActive(this.settings)||this.settings.mode!==`smart`)return;let e=[document.documentElement,document.body,...document.querySelectorAll(`body *`)];for(let t=0;t<e.length&&t<5e3;t+=1){let n=e[t];n&&this.smartenElement(n)}}scheduleSmartScan(){this.smartScanTimer||=window.setTimeout(()=>this.scanSmartMode(),80)}startSmartMode(){this.scheduleSmartScan(),!this.smartObserver&&(this.smartObserver=new MutationObserver(()=>this.scheduleSmartScan()),this.smartObserver.observe(document.documentElement,{childList:!0,subtree:!0}))}stopSmartMode(){this.smartObserver&&=(this.smartObserver.disconnect(),null),this.smartScanTimer&&=(window.clearTimeout(this.smartScanTimer),0),this.restoreSmartStyles()}parseThemeMode(t){return t===`smart`||t===`invert`||t===`soft`?t:e.DEFAULT_SETTINGS.mode}parseSettingsPatch(e){if(!this.isRecord(e))return{};let t={};typeof e.enabled==`boolean`&&(t.enabled=e.enabled),typeof e.mode==`string`&&(t.mode=this.parseThemeMode(e.mode));let n=this.parseNumberInRange(e.brightness,50,150);n!==void 0&&(t.brightness=n);let r=this.parseNumberInRange(e.contrast,50,150);r!==void 0&&(t.contrast=r);let i=this.parseNumberInRange(e.sepia,0,100);i!==void 0&&(t.sepia=i);let a=this.parseFiniteNumber(e.settingsVersion);a!==void 0&&(t.settingsVersion=a);let o=this.parseSiteOverrides(e.siteOverrides);o!==void 0&&(t.siteOverrides=o);let s=this.parseCustomPresets(e.customPresets);return s!==void 0&&(t.customPresets=s),`activePresetId`in e&&(t.activePresetId=typeof e.activePresetId==`string`&&e.activePresetId.length>0?e.activePresetId:null),t}parseThemePreset(t){return!this.isRecord(t)||typeof t.id!=`string`||t.id.length===0?null:{id:t.id,name:typeof t.name==`string`&&t.name.length>0?t.name:t.id,mode:this.parseThemeMode(t.mode),brightness:this.parseNumberInRange(t.brightness,50,150)??e.DEFAULT_SETTINGS.brightness,contrast:this.parseNumberInRange(t.contrast,50,150)??e.DEFAULT_SETTINGS.contrast,sepia:this.parseNumberInRange(t.sepia,0,100)??e.DEFAULT_SETTINGS.sepia,dot:typeof t.dot==`string`&&t.dot.length>0?t.dot:`#2FE0CE`,builtin:!1}}parseCustomPresets(e){if(!Array.isArray(e))return;let t=new Set,n=[];for(let r of e){let e=this.parseThemePreset(r);e&&!t.has(e.id)&&(t.add(e.id),n.push(e))}return n}migrateSettings(t){let n=this.parseSettingsPatch(t),r={...e.DEFAULT_SETTINGS,...n,siteOverrides:{...e.DEFAULT_SETTINGS.siteOverrides,...n.siteOverrides??{}}};return this.isLegacyInvertSettings(t)&&(r.mode=`smart`),r.settingsVersion=e.DEFAULT_SETTINGS.settingsVersion,r}parsePopupMessage(t){return!this.isRecord(t)||t.source!==e.MESSAGE_SOURCE?null:t.type===`get-state`?{source:e.MESSAGE_SOURCE,type:`get-state`}:t.type===`toggle-site`?{source:e.MESSAGE_SOURCE,type:`toggle-site`}:t.type===`set-settings`?{source:e.MESSAGE_SOURCE,type:`set-settings`,patch:this.parseSettingsPatch(t.patch)}:null}isRecord(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}parseFiniteNumber(e){if(!(typeof e!=`number`||!Number.isFinite(e)))return e}parseNumberInRange(e,t,n){let r=this.parseFiniteNumber(e);if(r!==void 0)return Math.min(n,Math.max(t,r))}parseSiteOverrides(e){if(!this.isRecord(e))return;let t={};for(let[n,r]of Object.entries(e))typeof r==`boolean`&&(t[this.normalizeHost(n)]=r);return t}isLegacyInvertSettings(e){return this.isRecord(e)?!this.parseFiniteNumber(e.settingsVersion)&&e.mode===`invert`:!1}createCSS(t){let n=this.clamp(t.brightness,50,150),r=this.clamp(t.contrast,50,150),i=this.clamp(t.sepia,0,100),a=e.ROOT_ATTR,o=e.MODE_ATTR;return`
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
        p,
        span,
        li,
        label,
        strong,
        em,
        small,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        code,
        pre,
        th,
        td
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
        filter: brightness(${n}%) contrast(${r}%) sepia(${i}%) !important;
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
        filter: invert(1) hue-rotate(180deg) brightness(${n}%) contrast(${r}%) sepia(${i}%) !important;
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
    `}cleanupLegacyNamespace(t=document.documentElement){document.getElementById(e.LEGACY_STYLE_ID)?.remove(),t.removeAttribute(e.LEGACY_ROOT_ATTR),t.removeAttribute(e.LEGACY_MODE_ATTR)}ensureStyle(){let t=document.getElementById(e.STYLE_ID);if(t instanceof HTMLStyleElement)return t;let n=document.createElement(`style`);return n.id=e.STYLE_ID,n.setAttribute(`data-owner`,`dark-mode-lite`),(document.documentElement||document.head||document).appendChild(n),n}applySettings(t){let n=this.settings.mode;this.settings=this.migrateSettings(t);let r=document.documentElement,i=this.isActive(this.settings);this.cleanupLegacyNamespace(r);let a=this.ensureStyle(),o=[`smart`,`soft`,`invert`].includes(this.settings.mode)?this.settings.mode:`smart`;a.textContent=this.createCSS(this.settings),r.setAttribute(e.MODE_ATTR,o),n===`smart`&&(!i||o!==`smart`)&&this.stopSmartMode(),i?(r.setAttribute(e.ROOT_ATTR,`true`),o===`smart`&&this.startSmartMode()):(r.removeAttribute(e.ROOT_ATTR),this.stopSmartMode())}readSettings(){chrome.storage.sync.get(null,e=>{this.applySettings(e)})}updateSettings(e,t){let n=this.migrateSettings({...this.settings,...e,siteOverrides:e.siteOverrides?{...e.siteOverrides}:{...this.settings.siteOverrides}});chrome.storage.sync.set(n,()=>{this.applySettings(n),t?.(this.getState())})}getState(){return{settings:this.settings,host:this.getHost(),active:this.isActive(this.settings),siteEnabled:this.getSiteState(this.settings)}}};(()=>{let t=globalThis;(t.__DARK_MODE_LITE_LOADED__||0)>=5||(t.__DARK_MODE_LITE_LOADED__=5,new e().start())})();