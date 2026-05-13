const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function approveAndSchedule() {
  try {
    // Get all pending previews
    const previews = await prisma.preview.findMany({
      where: { approved: false },
      include: { mediaItem: true }
    });

    console.log(`Found ${previews.length} pending previews`);

    // Get enabled schedules
    const schedules = await prisma.schedule.findMany({
      where: { enabled: true },
      orderBy: { time: 'asc' }
    });

    console.log(`Found ${schedules.length} enabled schedules`);

    if (schedules.length === 0) {
      console.log('No schedules configured. Please add schedules in settings.');
      return;
    }

    const now = new Date();
    let scheduleIndex = 0;
    let daysAhead = 0;

    for (const preview of previews) {
      // Approve preview
      await prisma.preview.update({
        where: { id: preview.id },
        data: { approved: true, status: 'APPROVED' }
      });

      // Find next available time slot
      let scheduledFor = null;
      while (!scheduledFor && daysAhead < 30) {
        const schedule = schedules[scheduleIndex % schedules.length];
        const [hours, minutes] = schedule.time.split(':').map(Number);
        
        const candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + daysAhead);
        candidateDate.setHours(hours, minutes, 0, 0);

        if (candidateDate > now) {
          scheduledFor = candidateDate;
        }

        scheduleIndex++;
        if (scheduleIndex % schedules.length === 0) {
          daysAhead++;
        }
      }

      if (scheduledFor) {
        // Create post
        const post = await prisma.post.create({
          data: {
            mediaItemId: preview.mediaItemId,
            previewId: preview.id,
            scheduledFor,
            status: 'SCHEDULED'
          }
        });

        console.log(`Scheduled post ${post.id} for ${scheduledFor.toISOString()}`);
      }
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveAndSchedule();
