import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const WILAYAS = [
  { code: 1, name: 'Adrar' }, { code: 2, name: 'Chlef' }, { code: 3, name: 'Laghouat' },
  { code: 4, name: 'Oum El Bouaghi' }, { code: 5, name: 'Batna' }, { code: 6, name: 'Béjaïa' },
  { code: 7, name: 'Biskra' }, { code: 8, name: 'Béchar' }, { code: 9, name: 'Blida' },
  { code: 10, name: 'Bouira' }, { code: 11, name: 'Tamanrasset' }, { code: 12, name: 'Tébessa' },
  { code: 13, name: 'Tlemcen' }, { code: 14, name: 'Tiaret' }, { code: 15, name: 'Tizi Ouzou' },
  { code: 16, name: 'Alger' }, { code: 17, name: 'Djelfa' }, { code: 18, name: 'Jijel' },
  { code: 19, name: 'Sétif' }, { code: 20, name: 'Saïda' }, { code: 21, name: 'Skikda' },
  { code: 22, name: 'Sidi Bel Abbès' }, { code: 23, name: 'Annaba' }, { code: 24, name: 'Guelma' },
  { code: 25, name: 'Constantine' }, { code: 26, name: 'Médéa' }, { code: 27, name: 'Mostaganem' },
  { code: 28, name: 'M\'Sila' }, { code: 29, name: 'Mascara' }, { code: 30, name: 'Ouargla' },
  { code: 31, name: 'Oran' }, { code: 32, name: 'El Bayadh' }, { code: 33, name: 'Illizi' },
  { code: 34, name: 'Bordj Bou Arréridj' }, { code: 35, name: 'Boumerdès' },
  { code: 36, name: 'El Tarf' }, { code: 37, name: 'Tindouf' }, { code: 38, name: 'Tissemsilt' },
  { code: 39, name: 'El Oued' }, { code: 40, name: 'Khenchela' }, { code: 41, name: 'Souk Ahras' },
  { code: 42, name: 'Tipaza' }, { code: 43, name: 'Mila' }, { code: 44, name: 'Aïn Defla' },
  { code: 45, name: 'Naâma' }, { code: 46, name: 'Aïn Témouchent' }, { code: 47, name: 'Ghardaïa' },
  { code: 48, name: 'Relizane' }, { code: 49, name: 'Timimoun' }, { code: 50, name: 'Bordj Badji Mokhtar' },
  { code: 51, name: 'Ouled Djellal' }, { code: 52, name: 'Béni Abbès' }, { code: 53, name: 'In Salah' },
  { code: 54, name: 'In Guezzam' }, { code: 55, name: 'Touggourt' }, { code: 56, name: 'Djanet' },
  { code: 57, name: 'El M\'Ghair' }, { code: 58, name: 'El Meniaa' },
];

async function main() {
  console.log('🌱 Démarrage du seed SokPlus...');

  // ── Admin User ────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sokplus.dz' },
    update: {},
    create: {
      email: 'admin@sokplus.dz',
      passwordHash: adminPassword,
      role: 'admin',
      fullName: 'Administrateur SokPlus',
      fullNameAr: 'مدير سوق بلس',
      phone: '+213550000001',
      isActive: true,
    },
  });

  const managerPassword = await bcrypt.hash('Manager@123456', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@sokplus.dz' },
    update: {},
    create: {
      email: 'manager@sokplus.dz',
      passwordHash: managerPassword,
      role: 'manager',
      fullName: 'Ahmed Benali',
      fullNameAr: 'أحمد بن علي',
      phone: '+213661234567',
      isActive: true,
    },
  });

  console.log('✅ Utilisateurs créés');

  // ── Categories ────────────────────────────────────────────
  const catAlimentaire = await prisma.category.upsert({
    where: { slug: 'alimentaire' },
    update: {},
    create: {
      nameFr: 'Alimentaire',
      nameAr: 'مواد غذائية',
      slug: 'alimentaire',
      icon: 'food',
      sortOrder: 1,
    },
  });

  const catBoissons = await prisma.category.upsert({
    where: { slug: 'boissons' },
    update: {},
    create: {
      nameFr: 'Boissons',
      nameAr: 'مشروبات',
      slug: 'boissons',
      icon: 'drink',
      sortOrder: 2,
    },
  });

  const catHygiene = await prisma.category.upsert({
    where: { slug: 'hygiene-entretien' },
    update: {},
    create: {
      nameFr: 'Hygiène & Entretien',
      nameAr: 'نظافة وصيانة',
      slug: 'hygiene-entretien',
      icon: 'clean',
      sortOrder: 3,
    },
  });

  const catEpicerie = await prisma.category.upsert({
    where: { slug: 'epicerie-seche' },
    update: {},
    create: {
      nameFr: 'Épicerie Sèche',
      nameAr: 'بقالة جافة',
      slug: 'epicerie-seche',
      parentId: catAlimentaire.id,
      icon: 'grocery',
      sortOrder: 1,
    },
  });

  const catConserves = await prisma.category.upsert({
    where: { slug: 'conserves' },
    update: {},
    create: {
      nameFr: 'Conserves',
      nameAr: 'معلبات',
      slug: 'conserves',
      parentId: catAlimentaire.id,
      icon: 'canned',
      sortOrder: 2,
    },
  });

  console.log('✅ Catégories créées');

  // ── Products ──────────────────────────────────────────────
  const products = [
    {
      sku: 'HUI-001',
      barcode: '6191234560001',
      nameFr: 'Huile de table Fleurial 5L',
      nameAr: 'زيت المائدة فلوريال 5 لتر',
      categoryId: catEpicerie.id,
      brand: 'Fleurial',
      unitOfMeasure: 'bidon',
      purchasePrice: 750,
      sellingPrice: 890,
      wholesalePrice: 820,
      minWholesaleQty: 12,
      tvaRate: 19,
    },
    {
      sku: 'SUC-001',
      barcode: '6191234560002',
      nameFr: 'Sucre Blanc Cevital 50kg',
      nameAr: 'سكر أبيض سيفيتال 50 كغ',
      categoryId: catEpicerie.id,
      brand: 'Cevital',
      unitOfMeasure: 'sac',
      purchasePrice: 4200,
      sellingPrice: 4800,
      wholesalePrice: 4500,
      minWholesaleQty: 10,
      tvaRate: 9,
    },
    {
      sku: 'FAR-001',
      barcode: '6191234560003',
      nameFr: 'Farine de blé Mercure 50kg',
      nameAr: 'دقيق القمح ميركور 50 كغ',
      categoryId: catEpicerie.id,
      brand: 'Mercure',
      unitOfMeasure: 'sac',
      purchasePrice: 2500,
      sellingPrice: 2900,
      wholesalePrice: 2700,
      minWholesaleQty: 10,
      tvaRate: 9,
    },
    {
      sku: 'EAU-001',
      barcode: '6191234560004',
      nameFr: 'Eau minérale Ifri 1.5L (pack 6)',
      nameAr: 'ماء معدني إيفري 1.5 لتر (علبة 6)',
      categoryId: catBoissons.id,
      brand: 'Ifri',
      unitOfMeasure: 'pack',
      purchasePrice: 180,
      sellingPrice: 240,
      wholesalePrice: 210,
      minWholesaleQty: 24,
      tvaRate: 19,
    },
    {
      sku: 'CON-001',
      barcode: '6191234560005',
      nameFr: 'Concentré de tomate Ramy 200g',
      nameAr: 'معجون الطماطم رامي 200 غ',
      categoryId: catConserves.id,
      brand: 'Ramy',
      unitOfMeasure: 'boite',
      purchasePrice: 55,
      sellingPrice: 75,
      wholesalePrice: 65,
      minWholesaleQty: 48,
      tvaRate: 9,
    },
    {
      sku: 'DET-001',
      barcode: '6191234560006',
      nameFr: 'Lessive Omo 5kg',
      nameAr: 'مسحوق الغسيل أومو 5 كغ',
      categoryId: catHygiene.id,
      brand: 'OMO',
      unitOfMeasure: 'paquet',
      purchasePrice: 750,
      sellingPrice: 950,
      wholesalePrice: 880,
      minWholesaleQty: 6,
      tvaRate: 19,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        ...p,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        wholesalePrice: p.wholesalePrice,
        tvaRate: p.tvaRate,
      },
    });
  }

  console.log('✅ Produits créés');

  // ── Clients ───────────────────────────────────────────────
  const clientUser = await prisma.user.upsert({
    where: { email: 'client1@example.dz' },
    update: {},
    create: {
      email: 'client1@example.dz',
      passwordHash: await bcrypt.hash('Client@123', 12),
      role: 'client',
      fullName: 'Entreprise Benkhaled',
      fullNameAr: 'مؤسسة بن خالد',
      phone: '+213771234567',
    },
  });

  await prisma.client.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      companyName: 'Entreprise Benkhaled Import-Export',
      companyNameAr: 'مؤسسة بن خالد للاستيراد والتصدير',
      nif: '099312345678901',
      nis: '12345678901234',
      rc: '31/00-0012345B/00',
      address: 'Rue des Frères Benaïssa, Oran',
      addressAr: 'شارع الإخوة بن عيسى، وهران',
      wilayaCode: 31,
      phone: '+213771234567',
      email: 'benkhaled@example.dz',
      creditLimit: 500000,
      isValidated: true,
      validationDate: new Date(),
    },
  });

  await prisma.client.create({
    data: {
      companyName: 'Grossiste El Amine Alger',
      companyNameAr: 'تاجر الجملة الأمين الجزائر',
      nif: '016312345678902',
      nis: '98765432109876',
      rc: '16/00-0098765B/00',
      address: 'Marché Bachdjarah, Alger',
      addressAr: 'سوق باش جراح، الجزائر',
      wilayaCode: 16,
      phone: '+213661987654',
      email: 'elamine@example.dz',
      creditLimit: 1000000,
      isValidated: true,
      validationDate: new Date(),
    },
  });

  console.log('✅ Clients créés');

  // ── Suppliers ─────────────────────────────────────────────
  await prisma.supplier.createMany({
    data: [
      {
        companyName: 'Cevital Spa',
        companyNameAr: 'سيفيتال',
        contactName: 'Mohamed Tounsi',
        phone: '+213345000001',
        email: 'commercial@cevital.com',
        address: 'Route nationale n°9, Béjaïa',
        wilayaCode: 6,
        nif: '006312345678903',
        isActive: true,
      },
      {
        companyName: 'Ifri SARL',
        companyNameAr: 'إيفري',
        contactName: 'Ali Iferouane',
        phone: '+213345000002',
        email: 'vente@ifri.dz',
        address: 'Ighzer Amokrane, Béjaïa',
        wilayaCode: 6,
        nif: '006312345678904',
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Fournisseurs créés');

  // ── Settings ──────────────────────────────────────────────
  const settingsData = [
    { key: 'company_name', value: 'SokPlus Grossiste', valueType: 'string', category: 'general' },
    { key: 'company_name_ar', value: 'سوك بلس للجملة', valueType: 'string', category: 'general' },
    { key: 'company_address', value: 'Zone industrielle, Oran', valueType: 'string', category: 'general' },
    { key: 'company_phone', value: '+213315000001', valueType: 'string', category: 'general' },
    { key: 'company_nif', value: '031312345678901', valueType: 'string', category: 'fiscal' },
    { key: 'company_nis', value: '31234567890123', valueType: 'string', category: 'fiscal' },
    { key: 'tva_standard', value: '19', valueType: 'number', category: 'fiscal' },
    { key: 'tva_reduit', value: '9', valueType: 'number', category: 'fiscal' },
    { key: 'timbre_fiscal', value: '50', valueType: 'number', category: 'fiscal' },
    { key: 'currency', value: 'DZD', valueType: 'string', category: 'general' },
    { key: 'stock_alert_email', value: 'stock@sokplus.dz', valueType: 'string', category: 'notifications' },
    { key: 'invoice_prefix', value: 'FAC', valueType: 'string', category: 'invoicing' },
    { key: 'order_prefix', value: 'CMD', valueType: 'string', category: 'orders' },
    { key: 'default_credit_days', value: '30', valueType: 'number', category: 'billing' },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { ...s, updatedBy: admin.id },
    });
  }

  console.log('✅ Paramètres créés');
  console.log('\n🎉 Seed terminé avec succès!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Admin: admin@sokplus.dz / Admin@123456');
  console.log('📧 Manager: manager@sokplus.dz / Manager@123456');
  console.log('📧 Client: client1@example.dz / Client@123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
