const nodemailer = require("nodemailer");
const Category = require("../models/Category");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // true for 465, false otherwise
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendResetEmail(email, resetToken) {
    try {
      const resetURL = `${process.env.BASEURL}/api/auth/reset-password?token=${resetToken}`;

      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You have requested to reset your password for your account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetURL}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetURL}</p>
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
                This is an automated message, please do not reply to this email.
            </p>
        </div>
      `;

      const mailOptions = {
        from: `"${process.env.APP_NAME || "Support"}" <${
          process.env.SMTP_FROM
        }>`,
        to: email,
        subject: "Password Reset Request",
        html: emailTemplate,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Reset email sent:", info.messageId);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Error sending reset email:", error.message);
      throw new Error("Failed to send reset email");
    }
  }

  async sendTicketUpdateToUser(email, ticketDetails) {
    try {
      const {
        _id: ticketId,
        status,
        updatedBy = "System",
        description,
        escalation,
        priority,
        category,
        subcategory,
      } = ticketDetails;

      const escalationNotice = escalation?.isEscalated
        ? `
      <p style="color: #c0392b;"><strong>Escalation Notice:</strong></p>
      <ul>
        <li><strong>Level:</strong> ${escalation.level}</li>
        <li><strong>Team:</strong> ${
          escalation.escalationTeam?.name || "N/A"
        }</li>
        <li><strong>Escalated At:</strong> ${new Date(
          escalation.escalatedAt
        ).toLocaleString()}</li>
      </ul>
      `
        : "";

      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #007bff;">Ticket #${ticketId} Update</h2>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Updated By:</strong> ${updatedBy}</p>
        <p><strong>Priority:</strong> ${priority || "N/A"}</p>
        <p><strong>Category:</strong> ${category?.name || "N/A"}</p>
        <p><strong>Subcategory:</strong> ${
          (Array.isArray(category?.subcategories)
            ? category.subcategories.find((s) => s._id === subcategory)?.name
            : null) || "N/A"
        }</p>
        <p><strong>Description:</strong> ${
          description || "No description provided"
        }</p>
        ${escalationNotice}
        <hr>
        <p style="font-size: 12px; color: #999;">Please do not reply to this email. This is an automated message.</p>
      </div>
    `;

      const mailOptions = {
        from: `"${process.env.APP_NAME || "Support"}" <${
          process.env.SMTP_FROM
        }>`,
        to: email,
        subject: `Ticket #${ticketId} - Status Update`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Ticket update email sent to user:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending ticket update email:", error.message);
      throw new Error("Failed to send ticket update email");
    }
  }

  async sendTicketCreationToUser(email, ticketDetails) {
    try {
      const {
        _id: ticketId,
        status,
        createdBy = "System",
        description,
        escalation,
        priority,
        category,
        subcategory,
        createdAt,
      } = ticketDetails;

      const categoryDetails = await Category.findById(category);

      console.log(subcategory);

      const escalationNotice = escalation?.isEscalated
        ? `
      <p style="color: #c0392b;"><strong>Escalation Notice:</strong></p>
      <ul>
        <li><strong>Level:</strong> ${escalation.level}</li>
        <li><strong>Team:</strong> ${
          escalation.escalationTeam?.name || "N/A"
        }</li>
        <li><strong>Escalated At:</strong> ${new Date(
          escalation.escalatedAt
        ).toLocaleString()}</li>
      </ul>
      `
        : "";

      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #28a745;">New Ticket Created: #${ticketId}</h2>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Created By:</strong> ${createdBy}</p>
        <p><strong>Created At:</strong> ${new Date(
          createdAt || Date.now()
        ).toLocaleString()}</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Category:</strong> ${categoryDetails?.name}</p>
        <p><strong>Subcategory:</strong> ${
          Array.isArray(categoryDetails?.subcategories)
            ? categoryDetails.subcategories.find((s) => s._id == subcategory)
                ?.name
            : null
        }</p>
        <p><strong>Description:</strong> ${
          description || "No description provided"
        }</p>
        ${escalationNotice}
        <hr>
        <p style="font-size: 12px; color: #999;">This is a system-generated email. Please do not reply.</p>
      </div>
    `;

      const mailOptions = {
        from: `"${process.env.APP_NAME || "Support"}" <${
          process.env.SMTP_FROM
        }>`,
        to: email,
        subject: `New Ticket Created: #${ticketId}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Ticket creation email sent to user:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending ticket creation email:", error.message);
      throw new Error("Failed to send ticket creation email");
    }
  }

  async sendNewTicketToAgent(email, ticketDetails) {
    try {
      const { ticketId, category, priority, userName } = ticketDetails;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>New Ticket Assigned</h2>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Priority:</strong> ${priority}</p>
          <p><strong>Requested By:</strong> ${userName}</p>
        </div>`;

      const mailOptions = {
        from: `"${process.env.APP_NAME || "Support"}" <${
          process.env.SMTP_FROM
        }>`,
        to: email,
        subject: `New Ticket Assigned: #${ticketId}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("New ticket email sent to agent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending new ticket email:", error.message);
      throw new Error("Failed to send new ticket email");
    }
  }

  async sendEscalationUserEmail(userEmail, ticket) {
    const html = `
      <div>
        <h3>Your ticket has been escalated</h3>
        <p><strong>Ticket ID:</strong> ${ticket._id}</p>
        <p><strong>Subject:</strong> ${ticket.subject}</p>
        <p>Your issue has been escalated to a higher support level for faster resolution.</p>
      </div>
    `;
    return this.sendEmail(userEmail, "Ticket Escalated", html);
  }

  async sendEscalationAgentEmail(agentEmail, ticket) {
    const html = `
      <div>
        <h3>New Escalated Ticket Assigned</h3>
        <p><strong>Ticket ID:</strong> ${ticket._id}</p>
        <p><strong>Subject:</strong> ${ticket.subject}</p>
        <p>This ticket has been escalated and assigned to you for resolution.</p>
      </div>
    `;
    return this.sendEmail(agentEmail, "New Escalated Ticket Assigned", html);
  }
}

module.exports = new EmailService();
