class WhatsAppTracker {

    constructor(buttonId = "joinWhatsappBtn") {

        this.buttonId = buttonId;

        this.waitingForHandoff = false;

        this.browserHidden = false;
    }

    trackUserInteraction() {

        const btn = document.getElementById(this.buttonId);

        if (!btn) {
            console.warn("WhatsApp button not found.");
            return;
        }

        btn.addEventListener("click", () => {

            this.waitingForHandoff = true;
            this.browserHidden = false;

            // Breadcrumb (gets attached to future errors)
            if (window.Sentry) {
                Sentry.addBreadcrumb({
                    category: "ui",
                    message: "WhatsApp Join button clicked",
                    level: "info"
                });

                Sentry.captureMessage(
                    "WhatsApp button clicked",
                    "info"
                );
            }

            // Wait 3 seconds to see if browser loses focus
            setTimeout(() => {

                if (
                    this.waitingForHandoff &&
                    !this.browserHidden &&
                    document.visibilityState === "visible"
                ) {

                    if (window.Sentry) {
                        Sentry.captureMessage(
                            "WhatsApp handoff NOT detected within 3 seconds",
                            "warning"
                        );
                    }

                    this.waitingForHandoff = false;
                }

            }, 3000);

        });

        document.addEventListener("visibilitychange", () => {

            if (
                this.waitingForHandoff &&
                document.visibilityState === "hidden"
            ) {

                this.browserHidden = true;
                this.waitingForHandoff = false;

                if (window.Sentry) {
                    Sentry.captureMessage(
                        "Browser hidden after WhatsApp click (likely WhatsApp opened)",
                        "info"
                    );
                }
            }

        });

        window.addEventListener("blur", () => {

            if (this.waitingForHandoff && window.Sentry) {

                Sentry.addBreadcrumb({
                    category: "browser",
                    message: "Browser lost focus after WhatsApp click",
                    level: "info"
                });

            }

        });

    }

}
