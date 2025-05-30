import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash password for all users (using a simple password for demo purposes)
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Seed users with different subscription tiers
  const users = [
    // Free tier users (no subscription)
    {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      hasSubscription: false,
      subscriptionTier: null,
      subscriptionExpiresAt: null,
    },
    {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
      hasSubscription: false,
      subscriptionTier: null,
      subscriptionExpiresAt: null,
    },
    // Basic tier users
    {
      email: 'alex.basic@example.com',
      name: 'Alex Johnson',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      hasSubscription: true,
      subscriptionTier: 'BASIC',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    {
      email: 'sarah.basic@example.com',
      name: 'Sarah Wilson',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      hasSubscription: true,
      subscriptionTier: 'BASIC',
      subscriptionExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    },
    // Premium tier users
    {
      email: 'mike.premium@example.com',
      name: 'Michael Brown',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
      hasSubscription: true,
      subscriptionTier: 'PREMIUM',
      subscriptionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    },
    {
      email: 'emma.premium@example.com',
      name: 'Emma Davis',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
      hasSubscription: true,
      subscriptionTier: 'PREMIUM',
      subscriptionExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    },
    // Enterprise tier users
    {
      email: 'david.enterprise@example.com',
      name: 'David Miller',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
      hasSubscription: true,
      subscriptionTier: 'ENTERPRISE',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
    {
      email: 'lisa.enterprise@example.com',
      name: 'Lisa Anderson',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
      hasSubscription: true,
      subscriptionTier: 'ENTERPRISE',
      subscriptionExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    },
    // Expired subscription user
    {
      email: 'expired.user@example.com',
      name: 'Tom Wilson',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tom',
      hasSubscription: false,
      subscriptionTier: 'BASIC',
      subscriptionExpiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  ];

  console.log('👥 Creating users...');
  
  // Create users one by one to get their IDs for creating related data
  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData,
    });
    createdUsers.push(user);
    console.log(`   ✓ Created user: ${user.name} (${user.email}) - ${user.subscriptionTier || 'FREE'}`);
  }

  console.log('📊 Creating sample projects...');
  
  // Create sample projects for different users
  const sampleProjects = [
    // Projects for John Doe (Free user)
    {
      title: 'Climate Change Impact on Agriculture',
      topic: 'Environmental Science',
      status: 'COMPLETED',
      userId: createdUsers[0].id,
      content: 'A comprehensive research paper examining the effects of climate change on global agricultural practices...',
    },
    {
      title: 'Artificial Intelligence in Healthcare',
      topic: 'Technology',
      status: 'DRAFT',
      userId: createdUsers[0].id,
    },
    
    // Projects for Alex Johnson (Basic user)
    {
      title: 'Renewable Energy Solutions',
      topic: 'Energy',
      status: 'RESEARCHING',
      userId: createdUsers[2].id,
    },
    {
      title: 'Machine Learning Applications',
      topic: 'Computer Science',
      status: 'WRITING',
      userId: createdUsers[2].id,
    },
    
    // Projects for Mike (Premium user)
    {
      title: 'Quantum Computing Fundamentals',
      topic: 'Physics',
      status: 'COMPLETED',
      userId: createdUsers[4].id,
      content: 'An in-depth analysis of quantum computing principles and their potential applications...',
    },
    {
      title: 'Blockchain Technology in Finance',
      topic: 'Finance',
      status: 'RESEARCHING',
      userId: createdUsers[4].id,
    },
    {
      title: 'Neural Networks and Deep Learning',
      topic: 'Artificial Intelligence',
      status: 'WRITING',
      userId: createdUsers[4].id,
    },
    
    // Projects for David (Enterprise user)
    {
      title: 'Global Economic Trends 2025',
      topic: 'Economics',
      status: 'COMPLETED',
      userId: createdUsers[6].id,
      content: 'A comprehensive analysis of global economic patterns and future projections...',
    },
    {
      title: 'Space Exploration Technologies',
      topic: 'Aerospace',
      status: 'RESEARCHING',
      userId: createdUsers[6].id,
    },
    {
      title: 'Biotechnology Innovations',
      topic: 'Biology',
      status: 'WRITING',
      userId: createdUsers[6].id,
    },
    {
      title: 'Cybersecurity Best Practices',
      topic: 'Information Security',
      status: 'DRAFT',
      userId: createdUsers[6].id,
    },
  ];

  for (const projectData of sampleProjects) {
    const project = await prisma.project.create({
      data: projectData,
    });
    console.log(`   ✓ Created project: ${project.title} for user ${createdUsers.find(u => u.id === project.userId)?.name}`);
  }

  console.log('⚙️ Creating user preferences...');
  
  // Create user preferences for some users
  const userPreferences = [
    {
      userId: createdUsers[4].id, // Premium user
      citationStyle: 'MLA',
      writingStyle: 'ACADEMIC',
      detailLevel: 'DETAILED',
      language: 'en',
      sourceTypes: ['ACADEMIC', 'NEWS', 'BOOKS'],
    },
    {
      userId: createdUsers[6].id, // Enterprise user
      citationStyle: 'APA',
      writingStyle: 'PROFESSIONAL',
      detailLevel: 'COMPREHENSIVE',
      language: 'en',
      sourceTypes: ['ACADEMIC', 'NEWS', 'BOOKS', 'REPORTS'],
    },
  ];

  for (const prefData of userPreferences) {
    await prisma.userPreference.create({
      data: prefData,
    });
    console.log(`   ✓ Created preferences for user ${createdUsers.find(u => u.id === prefData.userId)?.name}`);
  }

  console.log('🔍 Creating sample research sources...');
  
  // Create some sample research sources
  const researchSources = [
    {
      url: 'https://example.com/climate-change-agriculture',
      title: 'Climate Change Effects on Global Agriculture',
      content: 'Detailed analysis of how changing climate patterns affect crop yields...',
      summary: 'Climate change significantly impacts agricultural productivity worldwide.',
      author: 'Dr. Jane Climate',
      publishedAt: new Date('2024-01-15'),
      domain: 'example.com',
      relevance: 0.9,
    },
    {
      url: 'https://example.com/ai-healthcare',
      title: 'AI Applications in Modern Healthcare',
      content: 'Exploring the role of artificial intelligence in medical diagnosis...',
      summary: 'AI is revolutionizing healthcare through improved diagnostics.',
      author: 'Dr. Tech Smith',
      publishedAt: new Date('2024-02-20'),
      domain: 'example.com',
      relevance: 0.85,
    },
    {
      url: 'https://example.com/quantum-computing',
      title: 'Quantum Computing: The Next Frontier',
      content: 'Understanding quantum mechanics principles in computational systems...',
      summary: 'Quantum computing promises exponential computational improvements.',
      author: 'Prof. Quantum Lee',
      publishedAt: new Date('2024-03-10'),
      domain: 'example.com',
      relevance: 0.92,
    },
  ];

  for (const sourceData of researchSources) {
    await prisma.researchSource.create({
      data: sourceData,
    });
    console.log(`   ✓ Created research source: ${sourceData.title}`);
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   • Created ${users.length} users across different subscription tiers`);
  console.log(`   • Created ${sampleProjects.length} sample projects`);
  console.log(`   • Created ${userPreferences.length} user preference profiles`);
  console.log(`   • Created ${researchSources.length} research sources`);
  console.log('\n🔐 All users have the password: password123');
  console.log('\n📊 Subscription distribution:');
  console.log('   • Free: 2 users');
  console.log('   • Basic: 2 users');
  console.log('   • Premium: 2 users');
  console.log('   • Enterprise: 2 users');
  console.log('   • Expired: 1 user');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
