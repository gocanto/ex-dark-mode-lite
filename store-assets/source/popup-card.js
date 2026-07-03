/* Shared Dark Mode Lite popup mockup used by the social posts and store
   screenshots. Injects the card into every [data-dml-popup] element and
   optionally highlights one section via data-highlight="site|modes|controls". */
(function () {
	var card =
		'<div style="width:360px;border-radius:18px;background:linear-gradient(180deg,#0F141C 0%,#0B0F16 100%);border:1px solid rgba(255,255,255,.08);box-shadow:0 44px 90px -24px rgba(0,0,0,.75),0 0 60px -10px rgba(35,213,195,.18);overflow:hidden;position:relative;">' +
		'<div style="position:absolute;top:-46px;left:50%;transform:translateX(-50%);width:240px;height:130px;background:radial-gradient(circle at center,rgba(35,213,195,.16),transparent 70%);pointer-events:none;"></div>' +

		// header
		'<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 15px;position:relative;">' +
		'<div style="display:flex;align-items:center;gap:11px;">' +
		'<div style="width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(150deg,#123430,#0E211F);border:1px solid rgba(35,213,195,.32);color:#2FE0CE;box-shadow:0 0 14px rgba(35,213,195,.22),inset 0 1px 0 rgba(255,255,255,.06);">' +
		'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 13.2A8.2 8.2 0 1 1 10.8 3.5a6.4 6.4 0 0 0 9.7 9.7Z"/></svg>' +
		'</div>' +
		'<div><div style="font-size:14.5px;font-weight:600;letter-spacing:-.01em;color:#EAEEF4;line-height:1.1;">Dark Mode Lite</div>' +
		'<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#2FE0CE;box-shadow:0 0 6px rgba(47,224,206,.85);"></span><span style="font-size:11px;color:#8B95A4;">Live preview</span></div></div>' +
		'</div>' +
		'<div style="width:46px;height:27px;border-radius:999px;background:linear-gradient(180deg,#28E0CD,#18C1B0);position:relative;box-shadow:inset 0 1px 2px rgba(0,0,0,.25),0 0 0 1px rgba(35,213,195,.4),0 0 14px rgba(35,213,195,.3);">' +
		'<div style="position:absolute;top:3px;left:22px;width:21px;height:21px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.4);"></div></div>' +
		'</div>' +

		// content
		'<div style="padding:2px 16px 8px;display:flex;flex-direction:column;gap:16px;">' +

		// site
		'<div data-section="site" style="background:#12171F;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px;display:flex;align-items:center;gap:11px;">' +
		'<div style="width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:#1A212C;color:#9BA6B4;border:1px solid rgba(255,255,255,.05);flex-shrink:0;">' +
		'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="M3.7 12h16.6"/><path d="M12 3.7c2.1 2.3 3.3 5.2 3.3 8.3s-1.2 6-3.3 8.3c-2.1-2.3-3.3-5.2-3.3-8.3S9.9 6 12 3.7Z"/></svg></div>' +
		'<div style="flex:1;min-width:0;"><div style="font-family:\'Geist Mono\',ui-monospace,monospace;font-size:13px;font-weight:500;color:#EAEEF4;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">github.com</div>' +
		'<div style="font-size:11px;color:#7F8A99;margin-top:3px;">Dark mode active</div></div>' +
		'<div style="display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:999px;background:rgba(35,213,195,.12);border:1px solid rgba(35,213,195,.3);color:#2FE0CE;font-size:11.5px;font-weight:600;flex-shrink:0;">' +
		'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.4 4.4L19 7.3"/></svg>On here</div>' +
		'</div>' +

		// mode
		'<div data-section="modes"><div style="font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#5E6879;margin-bottom:9px;">Mode</div>' +
		'<div style="display:flex;gap:4px;padding:4px;background:#12171F;border:1px solid rgba(255,255,255,.06);border-radius:12px;">' +
		'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:38px;border-radius:9px;background:linear-gradient(180deg,#2A3542,#212A36);box-shadow:0 1px 2px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06);color:#38E0CE;font-size:12.5px;font-weight:600;">' +
		'<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 3.6l1.5 4.1 4.1 1.5-4.1 1.5L12 14.8l-1.5-4.1L6.4 9.2l4.1-1.5L12 3.6Z"/><path d="M18.2 14.4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/></svg>Smart</div>' +
		'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:38px;border-radius:9px;color:#8A94A2;font-size:12.5px;font-weight:500;">' +
		'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="M12 3.7a8.3 8.3 0 0 0 0 16.6Z" fill="currentColor" stroke="none"/></svg>Invert</div>' +
		'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:38px;border-radius:9px;color:#8A94A2;font-size:12.5px;font-weight:500;">' +
		'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.6"/><path d="M12 4.4v1.3M12 18.3v1.3M5.6 5.6l.9.9M17.5 17.5l.9.9M4.4 12h1.3M18.3 12h1.3M5.6 18.4l.9-.9M17.5 6.5l.9-.9"/></svg>Soft</div>' +
		'</div></div>' +

		// adjustments
		'<div data-section="controls"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;">' +
		'<div style="font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#5E6879;">Adjustments</div>' +
		'<div style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:500;color:#7F8A99;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 5.4v4.2h4.2"/><path d="M4 13a8 8 0 1 0 2-6.4L3.2 9.6"/></svg>Reset</div></div>' +
		'<div style="display:flex;flex-direction:column;gap:15px;">' +
		slider('Brightness', '100%', 50, 'sun') +
		slider('Contrast', '92%', 42, 'contrast') +
		slider('Sepia', '8%', 8, 'droplet') +
		'</div></div>' +

		// presets
		'<div data-section="presets"><div style="font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#5E6879;margin-bottom:9px;">Presets</div>' +
		'<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
		'<div style="display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:rgba(35,213,195,.12);border:1px solid rgba(35,213,195,.32);color:#2FE0CE;font-size:12px;font-weight:600;"><span style="width:7px;height:7px;border-radius:50%;background:#2FE0CE;box-shadow:0 0 6px rgba(47,224,206,.7);"></span>Default</div>' +
		'<div style="display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:#12171F;border:1px solid rgba(255,255,255,.07);color:#AEB7C4;font-size:12px;font-weight:500;"><span style="width:7px;height:7px;border-radius:50%;background:#7C8CF8;"></span>Reading</div>' +
		'<div style="display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:#12171F;border:1px solid rgba(255,255,255,.07);color:#AEB7C4;font-size:12px;font-weight:500;"><span style="width:7px;height:7px;border-radius:50%;background:#B084F5;"></span>Night Owl</div>' +
		'<div style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;background:transparent;border:1px dashed rgba(255,255,255,.16);color:#7F8A99;font-size:12px;font-weight:500;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13M5.5 12h13"/></svg>Save</div>' +
		'</div></div>' +

		'</div>' +

		// footer
		'<div style="border-top:1px solid rgba(255,255,255,.05);margin-top:6px;padding:13px 16px 15px;display:flex;align-items:center;justify-content:center;gap:5px;">' +
		'<span style="font-size:11px;color:#6C7686;">Crafted with</span>' +
		'<span style="color:#F2667B;display:flex;"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.3l-1.4-1.3C5.4 14.3 2.6 11.7 2.6 8.6 2.6 6.1 4.5 4.2 7 4.2c1.4 0 2.8.7 3.7 1.8l1.3 1.5 1.3-1.5c.9-1.1 2.3-1.8 3.7-1.8 2.5 0 4.4 1.9 4.4 4.4 0 3.1-2.8 5.7-8 10.4L12 20.3Z"/></svg></span>' +
		'<span style="font-size:11px;color:#6C7686;">by</span><span style="font-size:11px;font-weight:600;color:#AEB7C4;">gocanto.sh</span>' +
		'</div>' +

		'</div>';

	function slider(label, value, pct, icon) {
		var icons = {
			sun: '<circle cx="12" cy="12" r="3.9"/><path d="M12 2.6v2.1M12 19.3v2.1M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5"/>',
			contrast: '<circle cx="12" cy="12" r="8.3"/><path d="M12 3.7a8.3 8.3 0 0 0 0 16.6Z" fill="currentColor" stroke="none"/>',
			droplet: '<path d="M12 3.6c0 0 5.7 5.5 5.7 9.9a5.7 5.7 0 0 1-11.4 0C6.3 9.1 12 3.6 12 3.6Z"/>',
		};
		var knob = pct <= 12
			? '<div style="position:absolute;left:' + pct + '%;top:50%;transform:translate(-50%,-50%);width:15px;height:15px;border-radius:50%;background:#F3F5F8;box-shadow:0 2px 5px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.2);"></div>'
			: '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:2px;height:9px;border-radius:1px;background:rgba(255,255,255,.14);"></div>' +
			  '<div style="position:absolute;left:' + pct + '%;top:50%;transform:translate(-50%,-50%);width:15px;height:15px;border-radius:50%;background:#F3F5F8;box-shadow:0 2px 5px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.2);"></div>';
		return '<div><div style="display:flex;align-items:center;margin-bottom:8px;">' +
			'<span style="color:#8B95A4;display:flex;margin-right:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + icons[icon] + '</svg></span>' +
			'<span style="font-size:12.5px;font-weight:500;color:#DDE3EB;flex:1;">' + label + '</span>' +
			'<span style="font-family:\'Geist Mono\',ui-monospace,monospace;font-size:12px;color:#C4CCD6;background:#171D26;border:1px solid rgba(255,255,255,.05);border-radius:6px;padding:2px 7px;">' + value + '</span>' +
			'<span style="color:#2FD8C6;display:flex;margin-left:7px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 5.4v4.2h4.2"/><path d="M4 13a8 8 0 1 0 2-6.4L3.2 9.6"/></svg></span></div>' +
			'<div style="position:relative;height:15px;display:flex;align-items:center;">' +
			'<div style="position:absolute;left:0;right:0;height:5px;border-radius:999px;background:#232B37;"></div>' +
			'<div style="position:absolute;left:0;width:' + pct + '%;height:5px;border-radius:999px;background:linear-gradient(90deg,#1CC3B2,#2FE0CE);"></div>' +
			knob + '</div></div>';
	}

	var slots = document.querySelectorAll('[data-dml-popup]');
	slots.forEach(function (slot) {
		slot.innerHTML = card;
		var highlight = slot.getAttribute('data-highlight');
		if (highlight && highlight !== 'none') {
			var target = slot.querySelector('[data-section="' + highlight + '"]');
			if (target) {
				target.style.borderRadius = '14px';
				target.style.padding = target.style.padding || '10px';
				target.style.boxShadow = '0 0 0 1.5px rgba(47,224,206,.55),0 0 22px rgba(47,224,206,.28)';
				target.style.outlineOffset = '4px';
			}
		}
	});
})();
