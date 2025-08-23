import bcrypt from 'bcryptjs';
import { connectDatabase } from '@/config/database';
import { logger } from '@/utils/logger';
import { 
  User, 
  Language, 
  Translation, 
  Crop, 
  Disease, 
  Treatment,
  Expert,
  MarketPrice 
} from '@/models';

interface SeedResult {
  collection: string;
  created: number;
  updated: number;
  errors: string[];
}

export class DatabaseSeeder {
  private results: SeedResult[] = [];

  async seedAll(): Promise<SeedResult[]> {
    logger.info('Starting database seeding...');
    
    try {
      await connectDatabase();
      
      // Seed in order of dependencies
      await this.seedLanguages();
      await this.seedTranslations();
      await this.seedCrops();
      await this.seedDiseases();
      await this.seedTreatments();
      await this.seedUsers();
      await this.seedExperts();
      await this.seedMarketPrices();
      
      logger.info('Database seeding completed', { results: this.results });
      return this.results;
      
    } catch (error) {
      logger.error('Database seeding failed', { error });
      throw error;
    }
  }

  private async seedLanguages(): Promise<void> {
    logger.info('Seeding languages...');
    
    const languages = [
      {
        code: 'EN',
        name: 'English',
        nativeName: 'English',
        englishName: 'English',
        isRTL: false,
        isActive: true,
        isDefault: true,
        locale: 'en-US',
        countries: [
          { code: 'US', name: 'United States' },
          { code: 'UK', name: 'United Kingdom' },
          { code: 'CA', name: 'Canada' },
          { code: 'AU', name: 'Australia' }
        ],
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'HH:mm',
        currency: { code: 'USD', symbol: '$', position: 'before' },
        supportedFeatures: {
          voice: true,
          speechToText: true,
          textToSpeech: true,
          ocr: true
        }
      },
      {
        code: 'ES',
        name: 'Español',
        nativeName: 'Español',
        englishName: 'Spanish',
        isRTL: false,
        isActive: true,
        isDefault: false,
        locale: 'es-ES',
        countries: [
          { code: 'ES', name: 'Spain' },
          { code: 'MX', name: 'Mexico' },
          { code: 'AR', name: 'Argentina' },
          { code: 'CO', name: 'Colombia' }
        ],
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: { code: 'EUR', symbol: '€', position: 'after' },
        supportedFeatures: {
          voice: true,
          speechToText: true,
          textToSpeech: true,
          ocr: true
        }
      },
      {
        code: 'HI',
        name: 'हिंदी',
        nativeName: 'हिंदी',
        englishName: 'Hindi',
        isRTL: false,
        isActive: true,
        isDefault: false,
        locale: 'hi-IN',
        countries: [
          { code: 'IN', name: 'India' }
        ],
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: { code: 'INR', symbol: '₹', position: 'before' },
        supportedFeatures: {
          voice: true,
          speechToText: false,
          textToSpeech: true,
          ocr: false
        }
      },
      {
        code: 'FR',
        name: 'Français',
        nativeName: 'Français',
        englishName: 'French',
        isRTL: false,
        isActive: true,
        isDefault: false,
        locale: 'fr-FR',
        countries: [
          { code: 'FR', name: 'France' },
          { code: 'CA', name: 'Canada' },
          { code: 'BE', name: 'Belgium' }
        ],
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: { code: 'EUR', symbol: '€', position: 'after' },
        supportedFeatures: {
          voice: true,
          speechToText: true,
          textToSpeech: true,
          ocr: true
        }
      }
    ];

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const langData of languages) {
      try {
        const existing = await Language.findOne({ code: langData.code });
        if (existing) {
          await existing.updateOne(langData);
          updated++;
        } else {
          await Language.create(langData);
          created++;
        }
      } catch (error) {
        errors.push(`Failed to seed language ${langData.code}: ${error}`);
      }
    }

    this.results.push({ collection: 'Languages', created, updated, errors });
  }

  private async seedTranslations(): Promise<void> {
    logger.info('Seeding translations...');
    
    const baseTranslations = [
      {
        key: 'welcome.title',
        namespace: 'common',
        translations: {
          EN: 'Welcome to Plantix',
          ES: 'Bienvenido a Plantix',
          HI: 'प्लांटिक्स में आपका स्वागत है',
          FR: 'Bienvenue à Plantix'
        }
      },
      {
        key: 'nav.dashboard',
        namespace: 'ui',
        translations: {
          EN: 'Dashboard',
          ES: 'Panel de control',
          HI: 'डैशबोर्ड',
          FR: 'Tableau de bord'
        }
      },
      {
        key: 'nav.diagnosis',
        namespace: 'ui',
        translations: {
          EN: 'Diagnosis',
          ES: 'Diagnóstico',
          HI: 'निदान',
          FR: 'Diagnostic'
        }
      },
      {
        key: 'nav.crops',
        namespace: 'ui',
        translations: {
          EN: 'Crops',
          ES: 'Cultivos',
          HI: 'फसलें',
          FR: 'Cultures'
        }
      },
      {
        key: 'error.required_field',
        namespace: 'validation',
        translations: {
          EN: 'This field is required',
          ES: 'Este campo es obligatorio',
          HI: 'यह फ़ील्ड आवश्यक है',
          FR: 'Ce champ est obligatoire'
        }
      }
    ];

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const item of baseTranslations) {
      for (const [lang, translation] of Object.entries(item.translations)) {
        try {
          const existing = await Translation.findOne({
            key: item.key,
            namespace: item.namespace,
            language: lang
          });

          if (existing) {
            await existing.updateOne({ value: translation });
            updated++;
          } else {
            await Translation.create({
              key: item.key,
              namespace: item.namespace,
              language: lang,
              value: translation,
              context: 'ui',
              status: 'approved',
              metadata: {
                sourceLanguage: 'EN',
                version: 1,
                isAutomated: false
              }
            });
            created++;
          }
        } catch (error) {
          errors.push(`Failed to seed translation ${item.key}:${lang}: ${error}`);
        }
      }
    }

    this.results.push({ collection: 'Translations', created, updated, errors });
  }

  private async seedCrops(): Promise<void> {
    logger.info('Seeding crops...');
    
    const crops = [
      {
        name: 'Tomato',
        scientificName: 'Solanum lycopersicum',
        category: 'fruit',
        family: 'Solanaceae',
        description: 'Popular fruit vegetable grown worldwide for fresh consumption and processing',
        varieties: ['Cherry', 'Roma', 'Beefsteak', 'Grape'],
        growthStages: [
          { stage: 'seedling', duration: '2-3 weeks', description: 'Germination and early growth' },
          { stage: 'vegetative', duration: '4-6 weeks', description: 'Leaf and stem development' },
          { stage: 'flowering', duration: '2-3 weeks', description: 'Flower bud formation and blooming' },
          { stage: 'fruiting', duration: '8-12 weeks', description: 'Fruit development and ripening' }
        ],
        climaticRequirements: {
          temperature: { min: 18, max: 30, optimal: 24 },
          humidity: { min: 60, max: 80, optimal: 70 },
          rainfall: { min: 600, max: 1200, optimal: 800 },
          soilPH: { min: 6.0, max: 7.0, optimal: 6.5 }
        },
        nutritionalRequirements: {
          nitrogen: 150,
          phosphorus: 50,
          potassium: 200
        },
        commonDiseases: ['Blight', 'Wilt', 'Mosaic Virus'],
        commonPests: ['Aphids', 'Whitefly', 'Fruit Borer'],
        harvestInfo: {
          daysToMaturity: 80,
          yield: { min: 40, max: 80, unit: 'tons/hectare' },
          storageLife: 7,
          harvestSigns: ['Color change', 'Firmness', 'Size']
        },
        isActive: true
      },
      {
        name: 'Rice',
        scientificName: 'Oryza sativa',
        category: 'grain',
        family: 'Poaceae',
        description: 'Staple grain crop grown in flooded fields, primary food for billions',
        varieties: ['Basmati', 'Jasmine', 'Arborio', 'Brown Rice'],
        growthStages: [
          { stage: 'germination', duration: '7-10 days', description: 'Seed sprouting' },
          { stage: 'seedling', duration: '2-3 weeks', description: 'Early vegetative growth' },
          { stage: 'tillering', duration: '3-4 weeks', description: 'Formation of tillers' },
          { stage: 'panicle_initiation', duration: '1-2 weeks', description: 'Reproductive phase begins' },
          { stage: 'flowering', duration: '1 week', description: 'Pollination and fertilization' },
          { stage: 'grain_filling', duration: '4-6 weeks', description: 'Grain development' },
          { stage: 'maturation', duration: '1-2 weeks', description: 'Grain ripening' }
        ],
        climaticRequirements: {
          temperature: { min: 20, max: 35, optimal: 28 },
          humidity: { min: 70, max: 90, optimal: 80 },
          rainfall: { min: 1000, max: 2500, optimal: 1500 },
          soilPH: { min: 5.5, max: 7.0, optimal: 6.0 }
        },
        nutritionalRequirements: {
          nitrogen: 120,
          phosphorus: 40,
          potassium: 60
        },
        commonDiseases: ['Blast', 'Bacterial Blight', 'Sheath Rot'],
        commonPests: ['Stem Borer', 'Brown Planthopper', 'Rice Bug'],
        harvestInfo: {
          daysToMaturity: 120,
          yield: { min: 4, max: 8, unit: 'tons/hectare' },
          storageLife: 365,
          harvestSigns: ['Golden color', 'Panicle bending', 'Grain hardness']
        },
        isActive: true
      },
      {
        name: 'Wheat',
        scientificName: 'Triticum aestivum',
        category: 'grain',
        family: 'Poaceae',
        description: 'Major cereal grain crop, primary ingredient for bread and pasta',
        varieties: ['Hard Red Winter', 'Soft Red Winter', 'Hard Red Spring', 'Durum'],
        growthStages: [
          { stage: 'germination', duration: '7-14 days', description: 'Seed sprouting and emergence' },
          { stage: 'tillering', duration: '4-6 weeks', description: 'Formation of side shoots' },
          { stage: 'stem_elongation', duration: '4-5 weeks', description: 'Rapid stem growth' },
          { stage: 'booting', duration: '1-2 weeks', description: 'Ear formation within stem' },
          { stage: 'flowering', duration: '1-2 weeks', description: 'Pollination period' },
          { stage: 'grain_filling', duration: '4-6 weeks', description: 'Grain development' },
          { stage: 'maturation', duration: '2-3 weeks', description: 'Grain ripening and drying' }
        ],
        climaticRequirements: {
          temperature: { min: 12, max: 25, optimal: 18 },
          humidity: { min: 50, max: 70, optimal: 60 },
          rainfall: { min: 350, max: 750, optimal: 500 },
          soilPH: { min: 6.0, max: 7.5, optimal: 6.8 }
        },
        nutritionalRequirements: {
          nitrogen: 100,
          phosphorus: 30,
          potassium: 40
        },
        commonDiseases: ['Rust', 'Smut', 'Powdery Mildew'],
        commonPests: ['Aphids', 'Hessian Fly', 'Armyworm'],
        harvestInfo: {
          daysToMaturity: 110,
          yield: { min: 3, max: 7, unit: 'tons/hectare' },
          storageLife: 730,
          harvestSigns: ['Golden color', 'Dry stems', 'Hard grains']
        },
        isActive: true
      }
    ];

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const cropData of crops) {
      try {
        const existing = await Crop.findOne({ name: cropData.name });
        if (existing) {
          await existing.updateOne(cropData);
          updated++;
        } else {
          await Crop.create(cropData);
          created++;
        }
      } catch (error) {
        errors.push(`Failed to seed crop ${cropData.name}: ${error}`);
      }
    }

    this.results.push({ collection: 'Crops', created, updated, errors });
  }

  private async seedDiseases(): Promise<void> {
    logger.info('Seeding diseases...');
    
    const diseases = [
      {
        name: 'Late Blight',
        scientificName: 'Phytophthora infestans',
        category: 'fungal',
        pathogen: {
          name: 'Phytophthora infestans',
          type: 'fungus',
          scientificName: 'Phytophthora infestans',
          family: 'Peronosporaceae'
        },
        description: 'Destructive disease affecting tomatoes and potatoes, causing rapid plant death',
        severity: 'high',
        affectedCrops: [],
        symptoms: [
          {
            name: 'Dark lesions on leaves',
            description: 'Water-soaked, dark brown to black lesions appear on leaf margins',
            severity: 'severe',
            visualSigns: ['Dark spots', 'Water-soaked appearance'],
            affectedParts: ['leaf'],
            stageOfInfection: 'early'
          }
        ],
        causes: [
          {
            factor: 'environmental',
            description: 'Cool, wet weather conditions favor disease development',
            conditions: ['High humidity', 'Cool temperatures', 'Moisture on leaves']
          }
        ],
        treatments: [],
        preventionTips: [
          {
            category: 'cultural',
            title: 'Improve air circulation',
            description: 'Space plants adequately and remove lower leaves to improve airflow',
            effectiveness: 70,
            cost: 'low',
            difficulty: 'beginner'
          }
        ],
        environmentalFactors: {
          temperature: {
            optimal: { min: 15, max: 20 },
            range: { min: 10, max: 25 }
          },
          humidity: {
            optimal: { min: 80, max: 95 },
            range: { min: 70, max: 100 }
          }
        },
        isActive: true,
        isVerified: true
      },
      {
        name: 'Powdery Mildew',
        scientificName: 'Erysiphe cichoracearum',
        category: 'fungal',
        pathogen: {
          name: 'Erysiphe cichoracearum',
          type: 'fungus',
          scientificName: 'Erysiphe cichoracearum',
          family: 'Erysiphaceae'
        },
        description: 'Common fungal disease causing white powdery growth on plant surfaces',
        severity: 'medium',
        affectedCrops: [],
        symptoms: [
          {
            name: 'White powdery coating',
            description: 'White, powdery fungal growth appears on leaf surfaces',
            severity: 'moderate',
            visualSigns: ['White powder', 'Dusty appearance'],
            affectedParts: ['leaf', 'stem'],
            stageOfInfection: 'mid'
          }
        ],
        causes: [
          {
            factor: 'environmental',
            description: 'Warm days and cool nights with high humidity',
            conditions: ['Temperature fluctuations', 'High humidity', 'Poor air circulation']
          }
        ],
        treatments: [],
        preventionTips: [
          {
            category: 'biological',
            title: 'Use resistant varieties',
            description: 'Plant varieties with natural resistance to powdery mildew',
            effectiveness: 85,
            cost: 'low',
            difficulty: 'beginner'
          }
        ],
        environmentalFactors: {
          temperature: {
            optimal: { min: 20, max: 30 },
            range: { min: 15, max: 35 }
          },
          humidity: {
            optimal: { min: 40, max: 70 },
            range: { min: 30, max: 80 }
          }
        },
        isActive: true,
        isVerified: true
      }
    ];

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const diseaseData of diseases) {
      try {
        const existing = await Disease.findOne({ name: diseaseData.name });
        if (existing) {
          await existing.updateOne(diseaseData);
          updated++;
        } else {
          await Disease.create(diseaseData);
          created++;
        }
      } catch (error) {
        errors.push(`Failed to seed disease ${diseaseData.name}: ${error}`);
      }
    }

    this.results.push({ collection: 'Diseases', created, updated, errors });
  }

  private async seedTreatments(): Promise<void> {
    logger.info('Seeding treatments...');
    
    const treatments = [
      {
        name: 'Copper Fungicide Spray',
        diseaseNames: ['Late Blight', 'Early Blight'],
        affectedCrops: [],
        category: 'chemical',
        type: 'preventive',
        description: 'Copper-based fungicide effective against various fungal diseases',
        objective: 'Prevent and control fungal infections in crops',
        products: [
          {
            name: 'Copper Oxychloride',
            activeIngredient: 'Copper Oxychloride',
            concentration: '50% WP',
            formulation: 'wettable_powder',
            toxicityClass: 'III',
            organicApproved: true
          }
        ],
        application: {
          method: ['foliar_spray'],
          dosage: {
            amount: 2,
            unit: 'g/L',
            concentration: '0.2%'
          },
          equipment: ['Sprayer', 'Protective gear'],
          coverage: 'full_plant',
          technique: 'Thorough coverage of all plant surfaces',
          conditions: {
            temperature: { max: 30 },
            windSpeed: { max: 10 },
            timeOfDay: ['early_morning', 'evening'],
            weatherConditions: ['cloudy', 'no_rain_expected']
          }
        },
        schedule: {
          frequency: 'weekly',
          interval: 7,
          totalApplications: 3,
          timing: {
            startCondition: 'preventive',
            seasonalTiming: ['before_disease_season']
          }
        },
        safety: {
          preharvest: { interval: 7, unit: 'days' },
          reentry: { interval: 24, unit: 'hours' },
          protection: {
            required: ['gloves', 'mask', 'goggles'],
            recommendations: ['Wash hands after use', 'Avoid inhalation']
          },
          warnings: ['Do not spray during flowering', 'Avoid contact with eyes'],
          firstAid: ['Wash with plenty of water if contact occurs'],
          storage: ['Store in cool, dry place', 'Keep away from children'],
          disposal: ['Dispose of container properly', 'Do not reuse container']
        },
        effectiveness: {
          rating: 75,
          successRate: 80,
          timeToResults: {
            initial: '24-48 hours',
            full: '7-14 days'
          }
        },
        cost: {
          estimated: { amount: 25, currency: 'USD', unit: 'per hectare' }
        },
        environmental: {
          impact: 'medium',
          concerns: [
            {
              type: 'beneficial_insects',
              severity: 'low',
              description: 'May affect beneficial insects if sprayed directly'
            }
          ]
        },
        status: 'approved',
        isActive: true,
        isVerified: true,
        createdBy: 'system'
      }
    ];

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const treatmentData of treatments) {
      try {
        const existing = await Treatment.findOne({ name: treatmentData.name });
        if (existing) {
          await existing.updateOne(treatmentData);
          updated++;
        } else {
          await Treatment.create({
            ...treatmentData,
            lastUpdatedBy: 'system'
          });
          created++;
        }
      } catch (error) {
        errors.push(`Failed to seed treatment ${treatmentData.name}: ${error}`);
      }
    }

    this.results.push({ collection: 'Treatments', created, updated, errors });
  }

  private async seedUsers(): Promise<void> {
    logger.info('Seeding users...');
    
    const users = [
      {
        email: 'admin@plantix.com',
        password: await bcrypt.hash('admin123!@#', 12),
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isEmailVerified: true,
        isActive: true,
        bio: 'System administrator account',
        expertise: ['system_administration', 'agriculture', 'technology']
      },
      {
        email: 'expert@plantix.com',
        password: await bcrypt.hash('expert123!@#', 12),
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        role: 'expert',
        isEmailVerified: true,
        isActive: true,
        bio: 'Plant pathologist with 15 years of experience',
        expertise: ['plant_pathology', 'disease_diagnosis', 'crop_management'],
        farmingExperience: 15
      },
      {
        email: 'farmer@plantix.com',
        password: await bcrypt.hash('farmer123!@#', 12),
        firstName: 'John',
        lastName: 'Farmer',
        role: 'user',
        isEmailVerified: true,
        isActive: true,
        bio: 'Small-scale farmer growing vegetables',
        farmingExperience: 5,
        farmSize: 2.5,
        farmType: 'organic',
        cropsOfInterest: ['tomato', 'pepper', 'cucumber']
      }
    ];

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const userData of users) {
      try {
        const existing = await User.findOne({ email: userData.email });
        if (existing) {
          // Don't update password if user exists
          const { password, ...updateData } = userData;
          await existing.updateOne(updateData);
          updated++;
        } else {
          await User.create(userData);
          created++;
        }
      } catch (error) {
        errors.push(`Failed to seed user ${userData.email}: ${error}`);
      }
    }

    this.results.push({ collection: 'Users', created, updated, errors });
  }

  private async seedExperts(): Promise<void> {
    logger.info('Seeding experts...');
    
    // Find expert user
    const expertUser = await User.findOne({ email: 'expert@plantix.com' });
    if (!expertUser) {
      this.results.push({ 
        collection: 'Experts', 
        created: 0, 
        updated: 0, 
        errors: ['Expert user not found'] 
      });
      return;
    }

    const expertProfile = {
      userId: expertUser._id,
      expertProfile: {
        specializations: [
          {
            category: 'plant_pathology',
            level: 'expert',
            yearsOfExperience: 15,
            certifications: ['Plant Pathology PhD', 'Certified Crop Advisor']
          }
        ],
        expertise: {
          crops: ['tomato', 'potato', 'wheat', 'rice'],
          diseases: ['blight', 'rust', 'mildew', 'wilt'],
          regions: ['north_america', 'europe'],
          languages: ['en', 'es'],
          services: ['consultation', 'diagnosis_review', 'treatment_plan']
        },
        credentials: {
          education: [
            {
              degree: 'PhD in Plant Pathology',
              institution: 'University of Agriculture',
              year: 2008,
              fieldOfStudy: 'Plant Pathology'
            }
          ],
          certifications: [
            {
              name: 'Certified Crop Advisor',
              issuingOrganization: 'American Society of Agronomy',
              issueDate: new Date('2010-01-01'),
              credentialId: 'CCA-2010-001'
            }
          ],
          licenses: []
        },
        experience: {
          totalYears: 15,
          currentPosition: 'Senior Plant Pathologist',
          currentOrganization: 'Agricultural Research Institute',
          previousPositions: [
            {
              title: 'Research Scientist',
              organization: 'Plant Disease Laboratory',
              startDate: new Date('2008-06-01'),
              endDate: new Date('2012-12-31'),
              description: 'Conducted research on fungal diseases in crops'
            }
          ]
        }
      },
      verification: {
        status: 'verified',
        verifiedAt: new Date(),
        documents: []
      },
      availability: {
        status: 'available',
        workingHours: [
          { day: 1, startTime: '09:00', endTime: '17:00', timezone: 'UTC' },
          { day: 2, startTime: '09:00', endTime: '17:00', timezone: 'UTC' },
          { day: 3, startTime: '09:00', endTime: '17:00', timezone: 'UTC' },
          { day: 4, startTime: '09:00', endTime: '17:00', timezone: 'UTC' },
          { day: 5, startTime: '09:00', endTime: '17:00', timezone: 'UTC' }
        ],
        responseTime: {
          average: 120, // 2 hours
          target: 240, // 4 hours
          lastUpdated: new Date()
        }
      },
      consultation: {
        rates: [
          {
            service: 'quick_question',
            price: 25,
            currency: 'USD',
            duration: 15,
            description: 'Quick consultation for simple questions'
          },
          {
            service: 'detailed_consultation',
            price: 100,
            currency: 'USD',
            duration: 60,
            description: 'Comprehensive consultation with detailed analysis'
          }
        ],
        methods: ['chat', 'video'],
        languages: ['en', 'es'],
        paymentMethods: ['credit_card', 'paypal']
      },
      performance: {
        ratings: {
          overall: 4.5,
          communication: 4.7,
          expertise: 4.8,
          timeliness: 4.3,
          helpfulness: 4.6,
          totalReviews: 25
        },
        statistics: {
          totalConsultations: 150,
          completedConsultations: 142,
          cancelledConsultations: 8,
          averageSessionDuration: 45,
          responseTime: { average: 120, median: 90 },
          repeatClients: 35,
          successRate: 94.7
        }
      },
      subscription: {
        plan: 'premium',
        startDate: new Date(),
        autoRenew: true,
        features: ['priority_support', 'advanced_analytics', 'custom_branding'],
        paymentStatus: 'active'
      },
      isActive: true,
      joinedAt: new Date()
    };

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      const existing = await Expert.findOne({ userId: expertUser._id });
      if (existing) {
        await existing.updateOne(expertProfile);
        updated++;
      } else {
        await Expert.create(expertProfile);
        created++;
      }
    } catch (error) {
      errors.push(`Failed to seed expert profile: ${error}`);
    }

    this.results.push({ collection: 'Experts', created, updated, errors });
  }

  private async seedMarketPrices(): Promise<void> {
    logger.info('Seeding market prices...');
    
    const crops = await Crop.find({ isActive: true }).limit(3);
    
    const marketPrices = [];
    
    for (const crop of crops) {
      marketPrices.push({
        cropId: crop._id,
        cropName: crop.name,
        quality: 'grade_a',
        market: {
          name: 'Central Market',
          type: 'wholesale',
          location: {
            city: 'New York',
            state: 'NY',
            country: 'USA'
          }
        },
        pricing: {
          current: {
            price: Math.floor(Math.random() * 100) + 50,
            currency: 'USD',
            unit: 'kg',
            pricePerKg: Math.floor(Math.random() * 100) + 50
          },
          previous: {
            price: Math.floor(Math.random() * 100) + 45,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          history: [
            {
              date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              price: Math.floor(Math.random() * 100) + 40,
              volume: 1000
            }
          ]
        },
        supply: {
          availability: 'adequate',
          volume: 5000,
          unit: 'kg'
        },
        demand: {
          level: 'moderate',
          factors: ['seasonal demand', 'weather conditions']
        },
        metadata: {
          source: 'market_data_api',
          reliability: 85,
          lastUpdated: new Date()
        },
        isActive: true,
        isVerified: true
      });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const priceData of marketPrices) {
      try {
        const existing = await MarketPrice.findOne({ 
          cropId: priceData.cropId,
          'market.name': priceData.market.name 
        });
        
        if (existing) {
          await existing.updateOne(priceData);
          updated++;
        } else {
          await MarketPrice.create(priceData);
          created++;
        }
      } catch (error) {
        errors.push(`Failed to seed market price for ${priceData.cropName}: ${error}`);
      }
    }

    this.results.push({ collection: 'MarketPrices', created, updated, errors });
  }

  async clearDatabase(): Promise<void> {
    logger.warn('Clearing database...');
    
    const collections = [
      'users', 'languages', 'translations', 'crops', 'diseases', 
      'treatments', 'experts', 'marketprices', 'diagnoses', 
      'communityposts', 'notifications', 'onboardings', 'userconsents'
    ];

    for (const collection of collections) {
      try {
        await User.db.collection(collection).deleteMany({});
        logger.info(`Cleared collection: ${collection}`);
      } catch (error) {
        logger.error(`Failed to clear collection ${collection}:`, error);
      }
    }
  }
}

// CLI interface for running seeders
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      seeder.seedAll()
        .then((results) => {
          console.log('Seeding completed:', results);
          process.exit(0);
        })
        .catch((error) => {
          console.error('Seeding failed:', error);
          process.exit(1);
        });
      break;
      
    case 'clear':
      seeder.clearDatabase()
        .then(() => {
          console.log('Database cleared successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Database clearing failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: npm run seed [seed|clear]');
      process.exit(1);
  }
}

export default DatabaseSeeder;