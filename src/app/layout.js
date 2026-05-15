"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("@/app/globals.css");
var AuthProvider_1 = require("@/components/auth/AuthProvider");
var init_1 = require("@/lib/kernel/init");
(0, init_1.initKernel)();
exports.metadata = {
    metadataBase: new URL('https://systemfriction.org'),
    title: {
        default: 'System Friction Institute',
        template: '%s | System Friction Institute'
    },
    description: 'Longitudinal cognitive observatory and epistemic systems architecture.',
    robots: {
        index: true,
        follow: true
    },
    openGraph: {
        title: 'System Friction Institute',
        description: 'Longitudinal cognitive observatory and epistemic systems architecture.',
        url: 'https://systemfriction.org',
        siteName: 'System Friction Institute',
        locale: 'en_US',
        type: 'website'
    },
    alternates: {
        canonical: 'https://systemfriction.org'
    }
};
function RootLayout(_a) {
    var children = _a.children;
    return (<html lang="es" suppressHydrationWarning>
      <body>
        <AuthProvider_1.AuthProvider>{children}</AuthProvider_1.AuthProvider>
      </body>
    </html>);
}
