import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, landingPages } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

// Advanced template library with Dribbble-style metadata
const ADVANCED_TEMPLATES = {
  'modern-minimal': {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    category: 'E-commerce',
    style: 'Clean',
    previewColor: '#f8fafc',
    previewGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    tags: ['minimal', 'clean', 'modern'],
    difficulty: 'beginner',
    sections: 5,
    description: 'Clean and minimalist design perfect for modern brands',
    features: ['Hero section', 'Product grid', 'Testimonials', 'Newsletter signup', 'Footer'],
    thumbnail: '🎨',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Elevate Your Style',
            subheadline: 'Discover curated collections that define modern elegance',
            ctaText: 'Shop Now',
            ctaColor: '#1e293b',
            bgColor: '#ffffff',
            textColor: '#1e293b',
            bgImage: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Featured Collection',
            subtitle: 'Handpicked essentials for the discerning customer',
            columns: 4
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'Why Choose Us',
            items: ['✨ Premium Quality', '🚚 Fast Delivery', '💎 Exclusive Designs', '🔒 Secure Checkout']
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Customer Stories',
            items: [
              { name: 'Sarah M.', text: 'Absolutely love the quality and design!', rating: 5 },
              { name: 'James K.', text: 'Best shopping experience ever', rating: 5 }
            ]
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Stay Connected',
            subtitle: 'Subscribe for exclusive offers and updates'
          }
        }
      ]
    }
  },
  'luxury-premium': {
    id: 'luxury-premium',
    name: 'Luxury Premium',
    category: 'High-End',
    style: 'Elegant',
    previewColor: '#0a0a0a',
    previewGradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    tags: ['luxury', 'premium', 'elegant'],
    difficulty: 'advanced',
    sections: 7,
    description: 'Sophisticated design for luxury brands and high-end products',
    features: ['Cinematic hero', 'Parallax effects', 'Product showcase', 'Brand story', 'VIP membership', 'Concierge contact', 'Premium footer'],
    thumbnail: '💎',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Excellence Redefined',
            subheadline: 'Where luxury meets timeless elegance',
            ctaText: 'Discover',
            ctaColor: '#d4af37',
            bgColor: '#0a0a0a',
            textColor: '#d4af37',
            bgImage: ''
          }
        },
        {
          id: 'about',
          type: 'about',
          data: {
            title: 'Our Heritage',
            content: 'A legacy of excellence spanning generations. Each piece tells a story of unparalleled craftsmanship.',
            imageUrl: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Signature Collection',
            subtitle: 'Limited edition masterpieces',
            columns: 3
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'The Luxury Experience',
            items: ['👑 Personal Stylist', '🚚 White Glove Delivery', '💫 Exclusive Access', '🏆 Lifetime Warranty']
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Connoisseur Reviews',
            items: [
              { name: 'Alexander W.', text: 'Truly exceptional craftsmanship and service', rating: 5 },
              { name: 'Victoria L.', text: 'Worth every penny - pure luxury', rating: 5 }
            ]
          }
        },
        {
          id: 'cta',
          type: 'cta',
          data: {
            headline: 'Join the Elite',
            subtext: 'Exclusive membership for discerning clients',
            ctaText: 'Apply Now',
            ctaColor: '#d4af37',
            bgColor: '#1a1a1a'
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Private Consultation',
            subtitle: 'Schedule your exclusive viewing experience'
          }
        }
      ]
    }
  },
  'startup-tech': {
    id: 'startup-tech',
    category: 'SaaS',
    style: 'Bold',
    previewColor: '#6366f1',
    previewGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    tags: ['startup', 'tech', 'saas'],
    difficulty: 'intermediate',
    sections: 6,
    description: 'Dynamic and bold design for tech startups and SaaS products',
    features: ['Animated hero', 'Feature highlights', 'Pricing tables', 'Integration showcase', 'Team section', 'Demo signup'],
    thumbnail: '🚀',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Build Faster, Scale Better',
            subheadline: 'The all-in-one platform for modern teams',
            ctaText: 'Start Free Trial',
            ctaColor: '#ffffff',
            bgColor: '#6366f1',
            textColor: '#ffffff',
            bgImage: ''
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'Powerful Features',
            items: ['⚡ Lightning Fast', '🔒 Enterprise Security', '📊 Advanced Analytics', '🔌 100+ Integrations']
          }
        },
        {
          id: 'about',
          type: 'about',
          data: {
            title: 'How It Works',
            content: 'Our platform streamlines your workflow with intelligent automation and seamless collaboration tools.',
            imageUrl: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Pricing Plans',
            subtitle: 'Choose the perfect plan for your team',
            columns: 3
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Trusted by Innovators',
            items: [
              { name: 'Tech Startup Inc', text: 'Increased our productivity by 300%', rating: 5 },
              { name: 'Digital Agency Co', text: 'Best decision we made this year', rating: 5 }
            ]
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Get Started',
            subtitle: 'Start your free 14-day trial today'
          }
        }
      ]
    }
  },
  'creative-portfolio': {
    id: 'creative-portfolio',
    name: 'Creative Portfolio',
    category: 'Portfolio',
    style: 'Artistic',
    previewColor: '#ec4899',
    previewGradient: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
    tags: ['creative', 'portfolio', 'artistic'],
    difficulty: 'intermediate',
    sections: 6,
    description: 'Vibrant and expressive design for creative professionals',
    features: ['Bold typography', 'Portfolio grid', 'About section', 'Services showcase', 'Client logos', 'Contact form'],
    thumbnail: '🎭',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Create. Inspire. Transform.',
            subheadline: 'Award-winning creative studio crafting digital experiences',
            ctaText: 'View Work',
            ctaColor: '#ffffff',
            bgColor: '#ec4899',
            textColor: '#ffffff',
            bgImage: ''
          }
        },
        {
          id: 'about',
          type: 'about',
          data: {
            title: 'About Us',
            content: 'We are a collective of designers, developers, and dreamers creating meaningful digital experiences.',
            imageUrl: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Featured Projects',
            subtitle: 'A selection of our best work',
            columns: 3
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'Our Services',
            items: ['🎨 Brand Design', '💻 Web Development', '📱 Mobile Apps', '🎬 Motion Graphics']
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Client Love',
            items: [
              { name: 'Brand X', text: 'Exceeded all expectations', rating: 5 },
              { name: 'Company Y', text: 'True creative partners', rating: 5 }
            ]
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Let\'s Create Together',
            subtitle: 'Tell us about your project'
          }
        }
      ]
    }
  },
  'restaurant-fine': {
    id: 'restaurant-fine',
    name: 'Fine Dining',
    category: 'Restaurant',
    style: 'Elegant',
    previewColor: '#78350f',
    previewGradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
    tags: ['restaurant', 'dining', 'food'],
    difficulty: 'intermediate',
    sections: 7,
    description: 'Sophisticated design for fine dining establishments',
    features: ['Cinematic hero', 'Menu preview', 'Chef story', 'Reservation system', 'Gallery', 'Reviews', 'Location'],
    thumbnail: '🍽️',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Culinary Excellence',
            subheadline: 'Where every dish is a masterpiece',
            ctaText: 'Reserve Table',
            ctaColor: '#fbbf24',
            bgColor: '#78350f',
            textColor: '#ffffff',
            bgImage: ''
          }
        },
        {
          id: 'about',
          type: 'about',
          data: {
            title: 'Our Story',
            content: 'A passion for culinary artistry. Our chefs bring decades of experience from the world\'s finest kitchens.',
            imageUrl: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Signature Dishes',
            subtitle: 'Chef\'s recommendations',
            columns: 3
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'The Experience',
            items: ['👨‍🍳 Award-Winning Chefs', '🌿 Farm-to-Table', '🍷 Curated Wine List', '🎭 Live Entertainment']
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Guest Reviews',
            items: [
              { name: 'Food Critic', text: 'An unforgettable dining experience', rating: 5 },
              { name: 'Regular Guest', text: 'Our favorite restaurant in the city', rating: 5 }
            ]
          }
        },
        {
          id: 'cta',
          type: 'cta',
          data: {
            headline: 'Special Events',
            subtext: 'Private dining and special occasions',
            ctaText: 'Inquire',
            ctaColor: '#fbbf24',
            bgColor: '#451a03'
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Make a Reservation',
            subtitle: 'Book your table for an exceptional experience'
          }
        }
      ]
    }
  },
  'fitness-gym': {
    id: 'fitness-gym',
    name: 'Fitness Studio',
    category: 'Fitness',
    style: 'Energetic',
    previewColor: '#16a34a',
    previewGradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
    tags: ['fitness', 'gym', 'health'],
    difficulty: 'beginner',
    sections: 6,
    description: 'High-energy design for fitness studios and gyms',
    features: ['Motivational hero', 'Class schedule', 'Trainer profiles', 'Membership plans', 'Success stories', 'Free trial signup'],
    thumbnail: '💪',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Transform Your Body',
            subheadline: 'Join the fitness revolution and become your best self',
            ctaText: 'Start Free Trial',
            ctaColor: '#ffffff',
            bgColor: '#16a34a',
            textColor: '#ffffff',
            bgImage: ''
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'Why Choose Us',
            items: ['🏋️ State-of-the-art Equipment', '👨‍🏫 Expert Trainers', '🧘‍♀️ Diverse Classes', '📱 App Integration']
          }
        },
        {
          id: 'about',
          type: 'about',
          data: {
            title: 'Our Philosophy',
            content: 'We believe fitness is for everyone. Our supportive community and expert guidance help you achieve your goals.',
            imageUrl: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Membership Plans',
            subtitle: 'Flexible options for every lifestyle',
            columns: 3
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Success Stories',
            items: [
              { name: 'Member A', text: 'Lost 30lbs in 3 months!', rating: 5 },
              { name: 'Member B', text: 'Best gym I\'ve ever joined', rating: 5 }
            ]
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Start Your Journey',
            subtitle: 'Get your free trial pass today'
          }
        }
      ]
    }
  },
  'real-estate': {
    id: 'real-estate',
    name: 'Real Estate',
    category: 'Property',
    style: 'Professional',
    previewColor: '#1e40af',
    previewGradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    tags: ['real-estate', 'property', 'luxury'],
    difficulty: 'intermediate',
    sections: 7,
    description: 'Professional design for real estate agencies and property listings',
    features: ['Property search hero', 'Featured listings', 'Neighborhood guide', 'Agent profiles', 'Mortgage calculator', 'Testimonials', 'Contact form'],
    thumbnail: '🏠',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Find Your Dream Home',
            subheadline: 'Premium properties in the most desirable locations',
            ctaText: 'Search Listings',
            ctaColor: '#ffffff',
            bgColor: '#1e40af',
            textColor: '#ffffff',
            bgImage: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Featured Properties',
            subtitle: 'Exclusive listings just for you',
            columns: 3
          }
        },
        {
          id: 'about',
          type: 'about',
          data: {
            title: 'About Our Agency',
            content: 'With over 20 years of experience, we\'ve helped thousands of families find their perfect home.',
            imageUrl: ''
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'Why Work With Us',
            items: ['🎯 Local Market Experts', '📊 Data-Driven Pricing', '🤝 Full-Service Support', '🔑 Exclusive Access']
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Client Testimonials',
            items: [
              { name: 'The Smith Family', text: 'Made our home buying experience seamless', rating: 5 },
              { name: 'John D.', text: 'Sold our house above asking price', rating: 5 }
            ]
          }
        },
        {
          id: 'cta',
          type: 'cta',
          data: {
            headline: 'Free Home Valuation',
            subtext: 'Get an accurate assessment of your property\'s value',
            ctaText: 'Get Valuation',
            ctaColor: '#ffffff',
            bgColor: '#1e3a8a'
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Contact Us',
            subtitle: 'Let\'s find your perfect home together'
          }
        }
      ]
    }
  },
  'wedding-event': {
    id: 'wedding-event',
    name: 'Wedding & Events',
    category: 'Events',
    style: 'Romantic',
    previewColor: '#be185d',
    previewGradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
    tags: ['wedding', 'events', 'romantic'],
    difficulty: 'intermediate',
    sections: 6,
    description: 'Elegant and romantic design for wedding planners and event coordinators',
    features: ['Romantic hero', 'Gallery showcase', 'Services overview', 'Package options', 'Real weddings', 'Inquiry form'],
    thumbnail: '💒',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          data: {
            headline: 'Your Perfect Day',
            subheadline: 'Creating unforgettable moments that last a lifetime',
            ctaText: 'Start Planning',
            ctaColor: '#ffffff',
            bgColor: '#be185d',
            textColor: '#ffffff',
            bgImage: ''
          }
        },
        {
          id: 'about',
          type: 'about',
          data: {
            title: 'Our Story',
            content: 'We are passionate about creating magical celebrations. With attention to every detail, we bring your vision to life.',
            imageUrl: ''
          }
        },
        {
          id: 'products',
          type: 'products',
          data: {
            title: 'Our Services',
            subtitle: 'Full-service event planning and coordination',
            columns: 3
          }
        },
        {
          id: 'features',
          type: 'benefits',
          data: {
            title: 'What We Offer',
            items: ['💍 Wedding Planning', '🎉 Corporate Events', '🎂 Private Parties', '🌸 Destination Events']
          }
        },
        {
          id: 'testimonials',
          type: 'testimonial',
          data: {
            title: 'Happy Couples',
            items: [
              { name: 'Sarah & Mike', text: 'Our wedding was absolutely perfect', rating: 5 },
              { name: 'Emily & James', text: 'Couldn\'t have done it without them', rating: 5 }
            ]
          }
        },
        {
          id: 'contact',
          type: 'contact_form',
          data: {
            title: 'Let\'s Plan Together',
            subtitle: 'Tell us about your dream event'
          }
        }
      ]
    }
  }
};

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Get user's existing pages
    const existingPages = await db.query.landingPages.findMany({
        where: eq(landingPages.unitId, unit.id),
        columns: { id: true, title: true, pageSlug: true, templateId: true, createdAt: true },
        orderBy: [landingPages.createdAt]
    });

    return {
        unit,
        templates: ADVANCED_TEMPLATES,
        existingPages,
        categories: ['All', 'E-commerce', 'High-End', 'SaaS', 'Portfolio', 'Restaurant', 'Fitness', 'Property', 'Events'],
        styles: ['All', 'Clean', 'Elegant', 'Bold', 'Artistic', 'Energetic', 'Professional', 'Romantic'],
        difficulties: ['All', 'beginner', 'intermediate', 'advanced']
    };
};
