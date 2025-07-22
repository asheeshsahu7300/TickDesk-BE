const schedule = require("node-schedule");
const Authorization = require("../common/utils/generateJWT");
const fetch = require("node-fetch");

class JobScheduler {
  constructor(
    autoEscalationInterval = "*/10 * * * * *",
    refreshTokenInterval = "0 * * * *"
  ) {
    this.autoEscalationInterval = autoEscalationInterval;
    // this.refreshTokenInterval = refreshTokenInterval; // Runs every hour
    this.autoEscalationJob = null;
    this.refreshTokenJob = null;
    this.isRunning = true;
  }

  // Method to execute the auto-escalation job
  async autoEscalationScheduler() {
    console.log("Running auto-escalation job at:", new Date());

    try {
      // Generate a token for automation
      const existingToken = await Authorization.generateAutomationToken();

      // Make the POST request with the generated auth token
      const response = await fetch(
        "http://localhost:5000/api/escalations/auto-escalate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${existingToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Auto-escalation completed successfully:", data);
    } catch (error) {
      console.error("Error during auto-escalation:", error.message);
    }
  }

  // Method to execute the refresh token job
  // async refreshTokenScheduler() {
  //     console.log('Running refresh token job at:', new Date());

  //     try {

  //         const existingToken = await Authorization.generateAutomationToken();
  //         const response = await fetch("http://localhost:5000/api/auth/refresh-token", {
  //             method: 'POST',
  //             headers: {
  //                 'Content-Type': 'application/json',
  //                 'Authorization': `Bearer ${existingToken}`,

  //             },
  //             credentials: 'include',
  //         });

  //         if (!response.ok) {
  //             throw new Error(`HTTP error! Status: ${response.status}`);
  //         }

  //         const data = await response.json();
  //         console.log('Token refresh completed successfully:', data);
  //     } catch (error) {
  //         console.error('Error during token refresh:', error.message);
  //     }
  // }

  // Method to start all jobs
  start() {
    // Start auto-escalation job
    if (!this.autoEscalationJob) {
      this.autoEscalationJob = schedule.scheduleJob(
        this.autoEscalationInterval,
        () => this.autoEscalationScheduler()
      );
      console.log("Auto-escalation job scheduled successfully");
    }

    // Start refresh token job
    if (!this.refreshTokenJob) {
      this.refreshTokenJob = schedule.scheduleJob(
        this.refreshTokenInterval,
        () => this.refreshTokenScheduler()
      );
      console.log("Refresh token job scheduled successfully");
    }

    this.isRunning = true;
  }

  // Method to stop all jobs
  stop() {
    if (this.autoEscalationJob) {
      this.autoEscalationJob.cancel();
      this.autoEscalationJob = null;
      console.log("Auto-escalation job stopped");
    }

    if (this.refreshTokenJob) {
      this.refreshTokenJob.cancel();
      this.refreshTokenJob = null;
      console.log("Refresh token job stopped");
    }

    this.isRunning = false;
  }

  // Method to get status of all jobs
  getStatus() {
    return {
      isRunning: this.isRunning,
      autoEscalation: {
        isActive: !!this.autoEscalationJob,
        interval: this.autoEscalationInterval,
      },
      refreshToken: {
        isActive: !!this.refreshTokenJob,
        interval: this.refreshTokenInterval,
      },
    };
  }
}

module.exports = JobScheduler;
