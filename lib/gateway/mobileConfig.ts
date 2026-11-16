import { gatewayFetch } from "@/lib/gatewayFetch"
import { jsonResponse } from "@/lib/gateway/response"

/**
 * Public PWA/mobile config for an app: GET /api/v1/apps/:id/configuration, reshaped for the mobile shell.
 * Falls back to the default config on 404 or network failure. (Ported from the old
 * /api/apps/[id]/configuration/public Next.js route.)
 */
export async function fetchPublicMobileConfig(appId: string): Promise<Response> {
  try {
    const response = await gatewayFetch(`/api/v1/apps/${encodeURIComponent(appId)}/configuration`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 404) return jsonResponse({ success: true, data: getDefaultMobileConfig() })
      return jsonResponse({ success: false, error: data.error || "Failed to fetch configuration" }, response.status)
    }
    return jsonResponse({ success: true, data: transformToMobileConfig(data.data || data) })
  } catch {
    return jsonResponse({ success: true, data: getDefaultMobileConfig() })
  }
}

function transformToMobileConfig(config: any) {
    const appElements = config.appElements || {};
    const onboarding = config.onboarding || {};

    return {
        // App info
        appId: config.appId,
        appName: config.name || 'App',
        
        // Splash screen
        splash: {
            logo: appElements.logo,
            backgroundColor: onboarding.backgroundColors?.primary || appElements.buttons?.primaryColor || '#2563EB',
            textColor: onboarding.textColors?.primary || '#FFFFFF',
        },
        
        // Onboarding screens
        onboarding: {
            backgroundColor: onboarding.backgroundColors?.primary || '#2563EB',
            secondaryBackgroundColor: onboarding.backgroundColors?.secondary || '#1d4ed8',
            textColor: onboarding.textColors?.primary || '#1e293b',
            secondaryTextColor: onboarding.textColors?.secondary || '#6b7280',
            buttonColor: appElements.buttons?.primaryColor || '#2563EB',
            buttonTextColor: '#FFFFFF',
            fontFamily: onboarding.fontFamily || 'Inter',
            steps: [
                {
                    id: 'step-1',
                    title: onboarding.splash1?.title || 'Welcome to Your App',
                    description: onboarding.splash1?.subtitle || 'Discover amazing features and possibilities',
                    image: onboarding.splash1?.image || '/onboarding-chart-original.png',
                },
                {
                    id: 'step-2',
                    title: onboarding.splash2?.title || 'Track Your Progress',
                    description: onboarding.splash2?.subtitle || 'Monitor your activities and achieve your goals',
                    image: onboarding.splash2?.image || '/onboarding-chart-original.png',
                },
                {
                    id: 'step-3',
                    title: onboarding.splash3?.title || 'Get Started Today',
                    description: onboarding.splash3?.subtitle || 'Join thousands of happy users',
                    image: onboarding.splash3?.image || '/onboarding-chart-original.png',
                },
            ],
        },
        
        // Theme colors
        theme: {
            primaryColor: appElements.buttons?.primaryColor || '#2563EB',
            secondaryColor: appElements.buttons?.secondaryColor || '#E5E7EB',
            headerBackgroundColor: appElements.header?.backgroundColor || '#FFFFFF',
            headerTextColor: appElements.header?.textColor || '#1F2937',
            bodyBackgroundColor: appElements.body?.backgroundColor || '#F9FAFB',
            bodyTextColor: appElements.body?.textColor || '#374151',
        },
    };
}

/**
 * Default mobile config when no configuration exists
 */
function getDefaultMobileConfig() {
    return {
        appId: null,
        appName: 'Airpay',
        
        splash: {
            logo: null,
            backgroundColor: '#2563EB',
            textColor: '#FFFFFF',
        },
        
        onboarding: {
            backgroundColor: '#2563EB',
            secondaryBackgroundColor: '#1d4ed8',
            textColor: '#1e293b',
            secondaryTextColor: '#6b7280',
            buttonColor: '#2563EB',
            buttonTextColor: '#FFFFFF',
            fontFamily: 'Inter',
            steps: [
                {
                    id: 'step-1',
                    title: 'You ought to know how mortgage works',
                    description: 'Get an overview of how you are performing and motivate yourself to achieve even more.',
                    image: '/onboarding-chart-original.png',
                },
                {
                    id: 'step-2',
                    title: 'Track your expenses and save money',
                    description: 'Keep track of your spending habits and find new ways to save efficiently.',
                    image: '/onboarding-chart-original.png',
                },
                {
                    id: 'step-3',
                    title: 'Secure your future with smart investments',
                    description: 'Invest wisely and watch your wealth grow with our advanced analytics tools.',
                    image: '/onboarding-chart-original.png',
                },
            ],
        },
        
        theme: {
            primaryColor: '#2563EB',
            secondaryColor: '#E5E7EB',
            headerBackgroundColor: '#FFFFFF',
            headerTextColor: '#1F2937',
            bodyBackgroundColor: '#F9FAFB',
            bodyTextColor: '#374151',
        },
    };
}
