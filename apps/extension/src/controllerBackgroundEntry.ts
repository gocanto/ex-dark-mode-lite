import { NativeControllerBridge } from '@/controllerBackground';

void new NativeControllerBridge().start().catch(() => {
	// The reconnect loop handles expected browser-startup and local-app absence.
});
