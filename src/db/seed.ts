import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import bcrypt from "bcryptjs";

const db = drizzle({} as D1Database, { schema });

async function seed() {
  console.log("Seeding database...");

  // Create Master Admin
  const adminPassword = await bcrypt.hash("Panktiindustry@123456", 12);
  await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    firstName: "Panktiindustry",
    lastName: "",
    email: "panktiindustry@gmail.com",
    phone: "9876543210",
    passwordHash: adminPassword,
    role: "MASTER_ADMIN",
    status: "ACTIVE",
  });
  console.log("Created admin: panktiindustry@gmail.com");

  // Create Team Members
  const teamMembers = [
    { firstName: "Mike", lastName: "Johnson", email: "mike@example.com", phone: "9876543211" },
    { firstName: "Sarah", lastName: "Williams", email: "sarah@example.com", phone: "9876543212" },
    { firstName: "David", lastName: "Brown", email: "david@example.com", phone: "9876543213" },
    { firstName: "Emily", lastName: "Davis", email: "emily@example.com", phone: "9876543214" },
    { firstName: "James", lastName: "Wilson", email: "james@example.com", phone: "9876543215" },
  ];

  const memberPassword = await bcrypt.hash("Member@123456", 12);
  const createdMembers = [];

  for (const member of teamMembers) {
    const id = crypto.randomUUID();
    await db.insert(schema.users).values({
      id,
      ...member,
      passwordHash: memberPassword,
      role: "TEAM_MEMBER",
      status: "ACTIVE",
    });
    createdMembers.push({ id, ...member });
    console.log("Created team member:", member.email);
  }

  // Create Customers with Meta fields
  const firstNames = ["John", "Jane", "Robert", "Lisa", "Michael", "Sarah", "David", "Emily", "James", "Maria", "William", "Jennifer", "Richard", "Jessica", "Thomas", "Ashley", "Charles", "Amanda", "Daniel", "Stephanie"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
  const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"];
  const states = ["Maharashtra", "Delhi", "Karnataka", "Telangana", "Tamil Nadu", "West Bengal", "Gujarat", "Rajasthan", "Uttar Pradesh"];
  const leadStatuses = ["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED"];
  const campaigns = ["Summer Sale 2026", "Diwali Special", "New Product Launch", "Brand Awareness", "Retargeting Campaign"];
  const adsets = ["Ad Set A", "Ad Set B", "Ad Set C", "Ad Set D"];
  const ads = ["Ad Creative 1", "Ad Creative 2", "Ad Creative 3", "Ad Creative 4"];
  const forms = ["Lead Form - Website", "Lead Form - Landing Page", "Lead Form - Facebook"];

  const customers = [];
  for (let i = 0; i < 100; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const leadStatus = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];
    const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
    const adset = adsets[Math.floor(Math.random() * adsets.length)];
    const ad = ads[Math.floor(Math.random() * ads.length)];
    const form = forms[Math.floor(Math.random() * forms.length)];
    const assignedMember = createdMembers[Math.floor(Math.random() * createdMembers.length)];
    const metaLeadId = `META${Date.now()}${i}`;

    const id = crypto.randomUUID();
    await db.insert(schema.customers).values({
      id,
      metaLeadId,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      phone: `98${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
      address: `${Math.floor(Math.random() * 1000) + 1} Main Street`,
      city,
      state,
      leadStatus: leadStatus as typeof schema.customers.$inferSelect.leadStatus,
      source: "Meta Ads",
      campaignName: campaign,
      adsetName: adset,
      adName: ad,
      formName: form,
      customFields: JSON.stringify({
        "What product are you interested in?": "Product A",
        "Preferred location?": city,
        "Budget?": "₹50,000 - ₹1,00,000",
        "Are you ready to buy?": "Yes",
      }),
      remarks: Math.random() > 0.5 ? "Customer showed interest in our services. Follow up required." : null,
      assignedTeamMemberId: assignedMember.id,
      createdById: assignedMember.id,
      updatedById: assignedMember.id,
    });
    customers.push({ id, name: `${firstName} ${lastName}` });
  }
  console.log(`Created ${customers.length} customers`);

  // Create Payments
  const paymentModes = ["CASH", "BANK_TRANSFER", "UPI", "CREDIT_CARD", "DEBIT_CARD", "CHEQUE", "OTHER"];
  const paymentStatuses = ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"];

  for (const customer of customers) {
    const numPayments = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numPayments; i++) {
      const amount = Math.floor(Math.random() * 50000) + 5000;
      const paymentMode = paymentModes[Math.floor(Math.random() * paymentModes.length)];
      const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
      const paymentDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);

      await db.insert(schema.payments).values({
        id: crypto.randomUUID(),
        customerId: customer.id,
        teamMemberId: createdMembers[Math.floor(Math.random() * createdMembers.length)].id,
        amount,
        paymentDate,
        paymentMode: paymentMode as typeof schema.payments.$inferInsert.paymentMode,
        paymentStatus: paymentStatus as typeof schema.payments.$inferInsert.paymentStatus,
        transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
        remarks: Math.random() > 0.7 ? "Payment received on time" : null,
      });
    }
  }
  console.log("Created payments");

  // Create Activity Logs
  for (const customer of customers.slice(0, 10)) {
    await db.insert(schema.activityLogs).values({
      id: crypto.randomUUID(),
      userId: createdMembers[0].id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      description: `Customer "${customer.name}" was created`,
    });
  }
  console.log("Created activity logs");

  console.log("Seeding completed!");
  console.log("\n=== DEVELOPMENT CREDENTIALS ===");
  console.log("Admin: panktiindustry@gmail.com / Panktiindustry@123456");
  console.log("Team Member: mike@example.com / Member@123456");
  console.log("================================\n");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
