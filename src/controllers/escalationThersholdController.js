const EscalationThreshold = require('../models/EscalationThreshold');

class EscalationThresholdController {
    // Create new threshold
    async createThreshold(req, res) {
        try {
            const { priority, hours } = req.body;

            // Check if threshold for priority already exists
            const existingThreshold = await EscalationThreshold.findOne({ priority });
            if (existingThreshold) {
                return res.status(400).json({
                    success: false,
                    message: `Escalation threshold for ${priority} priority already exists`
                });
            }

            const threshold = await EscalationThreshold.create({
                priority,
                hours
            });

            return res.status(201).json({
                success: true,
                message: 'Escalation threshold created successfully',
                data: threshold
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error creating escalation threshold',
                error: error.message
            });
        }
    }

    // Get all thresholds
    async getAllThresholds(req, res) {
        try {
            const thresholds = await EscalationThreshold.find()
                .sort({ 
                    // Custom sort for priority levels
                    priority: 1
                });

            return res.status(200).json({
                success: true,
                count: thresholds.length,
                data: thresholds
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching escalation thresholds',
                error: error.message
            });
        }
    }

    // Get threshold by ID
    async getThresholdById(req, res) {
        try {
            const threshold = await EscalationThreshold.findById(req.params.id);

            if (!threshold) {
                return res.status(404).json({
                    success: false,
                    message: 'Escalation threshold not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: threshold
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching escalation threshold',
                error: error.message
            });
        }
    }

    // Update threshold
    async updateThreshold(req, res) {
        try {
            const { hours } = req.body;
            const thresholdId = req.params.id;

            const threshold = await EscalationThreshold.findById(thresholdId);
            if (!threshold) {
                return res.status(404).json({
                    success: false,
                    message: 'Escalation threshold not found'
                });
            }

            // Don't allow priority changes
            if (req.body.priority && req.body.priority !== threshold.priority) {
                return res.status(400).json({
                    success: false,
                    message: 'Escalation threshold priority cannot be modified'
                });
            }

            const updatedThreshold = await EscalationThreshold.findByIdAndUpdate(
                thresholdId,
                { hours },
                { new: true, runValidators: true }
            );

            return res.status(200).json({
                success: true,
                message: 'Escalation threshold updated successfully',
                data: updatedThreshold
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error updating escalation threshold',
                error: error.message
            });
        }
    }

    // Delete threshold
    async deleteThreshold(req, res) {
        try {
            const threshold = await EscalationThreshold.findById(req.params.id);
            if (!threshold) {
                return res.status(404).json({
                    success: false,
                    message: 'Escalation threshold not found'
                });
            }

            await threshold.remove();

            return res.status(200).json({
                success: true,
                message: 'Escalation threshold deleted successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error deleting escalation threshold',
                error: error.message
            });
        }
    }

    // Validate thresholds configuration
    async validateThresholds(req, res) {
        try {
            const thresholds = await EscalationThreshold.find();
            
            const validationResults = {
                isValid: true,
                issues: [],
                recommendations: []
            };

            // Check for missing priority levels
            const priorities = ['Low', 'Medium', 'High', 'Urgent'];
            const existingPriorities = thresholds.map(t => t.priority);
            const missingPriorities = priorities.filter(p => !existingPriorities.includes(p));

            if (missingPriorities.length > 0) {
                validationResults.isValid = false;
                validationResults.issues.push({
                    type: 'missing_priorities',
                    message: 'Missing thresholds for some priority levels',
                    priorities: missingPriorities
                });
                validationResults.recommendations.push(
                    'Create thresholds for all priority levels to ensure complete escalation coverage'
                );
            }

            // Validate escalation hours logic
            const sortedThresholds = thresholds.sort((a, b) => {
                return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
            });

            for (let i = 0; i < sortedThresholds.length - 1; i++) {
                const current = sortedThresholds[i];
                const next = sortedThresholds[i + 1];

                if (current.hours <= next.hours) {
                    validationResults.isValid = false;
                    validationResults.issues.push({
                        type: 'invalid_hours',
                        message: 'Higher priority tickets should have shorter escalation times',
                        priorities: [current.priority, next.priority],
                        hours: [current.hours, next.hours]
                    });
                }
            }

            return res.status(200).json({
                success: true,
                data: validationResults
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error validating escalation thresholds',
                error: error.message
            });
        }
    }
}

module.exports = new EscalationThresholdController();