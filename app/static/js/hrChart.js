// Sporter - Heart Rate Chart Component

class HRChart {
    constructor(canvasId, userProfile = null) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.chart = null;
        this.userProfile = userProfile;
        this.hrZones = null;
        
        this.calculateHRZones();
    }

    calculateHRZones() {
        if (!this.userProfile?.hrMax || !this.userProfile?.hrResting) {
            // Default zones without user profile
            this.hrZones = null;
            return;
        }

        const { hrMax, hrResting } = this.userProfile;
        const hrReserve = hrMax - hrResting;

        // Standard HR zones based on % of HR Reserve (Karvonen method)
        this.hrZones = {
            recovery: {
                min: Math.round(hrResting + (hrReserve * 0.0)),
                max: Math.round(hrResting + (hrReserve * 0.6)),
                color: 'rgba(108, 117, 125, 0.3)', // Gray
                label: 'Recovery (0-60%)'
            },
            aerobic: {
                min: Math.round(hrResting + (hrReserve * 0.6)),
                max: Math.round(hrResting + (hrReserve * 0.7)),
                color: 'rgba(40, 167, 69, 0.3)', // Green
                label: 'Aerobic (60-70%)'
            },
            tempo: {
                min: Math.round(hrResting + (hrReserve * 0.7)),
                max: Math.round(hrResting + (hrReserve * 0.8)),
                color: 'rgba(255, 193, 7, 0.3)', // Yellow
                label: 'Tempo (70-80%)'
            },
            threshold: {
                min: Math.round(hrResting + (hrReserve * 0.8)),
                max: Math.round(hrResting + (hrReserve * 0.9)),
                color: 'rgba(255, 108, 0, 0.3)', // Orange
                label: 'Threshold (80-90%)'
            },
            vo2max: {
                min: Math.round(hrResting + (hrReserve * 0.9)),
                max: hrMax,
                color: 'rgba(220, 53, 69, 0.3)', // Red
                label: 'VO2 Max (90-100%)'
            }
        };
    }

    async render(hrData) {
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas || !hrData?.data?.length) {
            console.warn('Cannot render HR chart: missing canvas or data');
            return;
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const chartData = this.prepareChartData(hrData);
        const chartOptions = this.getChartOptions();

        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: chartData,
            options: chartOptions
        });
    }

    prepareChartData(hrData) {
        const data = hrData.data || [];
        
        // Separate included and excluded points
        const includedPoints = data.filter(point => !point.excluded);
        const excludedPoints = data.filter(point => point.excluded);

        const datasets = [
            {
                label: 'Heart Rate',
                data: includedPoints.map(point => ({
                    x: point.time_seconds / 60, // Convert to minutes
                    y: point.heart_rate,
                    pointData: point // Store original data for tooltip
                })),
                borderColor: 'rgb(220, 53, 69)',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                borderWidth: 2,
                pointRadius: 1,
                pointHoverRadius: 4,
                fill: false,
                tension: 0.1
            }
        ];

        // Add excluded points as separate dataset
        if (excludedPoints.length > 0) {
            datasets.push({
                label: 'Excluded HR',
                data: excludedPoints.map(point => ({
                    x: point.time_seconds / 60, // Convert to minutes
                    y: point.heart_rate,
                    pointData: point // Store original data for tooltip
                })),
                borderColor: 'rgba(108, 117, 125, 0.5)',
                backgroundColor: 'rgba(108, 117, 125, 0.3)',
                borderWidth: 1,
                pointRadius: 2,
                pointHoverRadius: 5,
                fill: false,
                pointStyle: 'cross',
                borderDash: [5, 5]
            });
        }

        return { datasets };
    }

    getChartOptions() {
        const plugins = {
            title: {
                display: true,
                text: 'Heart Rate Analysis',
                font: { size: 16 }
            },
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                mode: 'nearest',
                intersect: false,
                callbacks: {
                    title: (tooltipItems) => {
                        const timeMinutes = tooltipItems[0].parsed.x;
                        const minutes = Math.floor(timeMinutes);
                        const seconds = Math.round((timeMinutes % 1) * 60);
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    },
                    label: (context) => {
                        const hr = Math.round(context.parsed.y);
                        const pointData = context.raw.pointData;
                        let label = `${context.dataset.label}: ${hr} bpm`;
                        
                        // Add HR zone if available
                        if (this.hrZones && context.datasetIndex === 0) {
                            const zone = this.getHRZone(hr);
                            if (zone) {
                                label += ` (${zone.label})`;
                            }
                        }
                        
                        // Add exclusion reason for excluded points
                        if (pointData && pointData.excluded && pointData.exclusion_reason) {
                            const reasonLabels = {
                                'hr_startup': 'HR Startup Period',
                                'hr_statistical_outlier': 'Statistical Outlier',
                                'invalid_hr': 'Invalid HR Value'
                            };
                            const reason = reasonLabels[pointData.exclusion_reason] || pointData.exclusion_reason;
                            label += ` - Excluded: ${reason}`;
                        }
                        
                        return label;
                    }
                }
            }
        };

        // Add HR zone annotations if user profile exists
        if (this.hrZones) {
            plugins.annotation = {
                annotations: this.createZoneAnnotations()
            };
        }

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Training Time (minutes)'
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        callback: function(value) {
                            const minutes = Math.floor(value);
                            const seconds = Math.round((value % 1) * 60);
                            return seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${minutes}:00`;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Heart Rate (bpm)'
                    },
                    min: this.getMinHR(),
                    max: this.getMaxHR()
                }
            },
            plugins
        };
    }

    createZoneAnnotations() {
        const annotations = {};
        
        Object.entries(this.hrZones).forEach(([key, zone]) => {
            annotations[`zone_${key}`] = {
                type: 'box',
                yMin: zone.min,
                yMax: zone.max,
                backgroundColor: zone.color,
                borderWidth: 0,
                label: {
                    display: true,
                    content: zone.label,
                    position: 'start',
                    xAdjust: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    font: { size: 10 }
                }
            };
        });

        return annotations;
    }

    getHRZone(heartRate) {
        if (!this.hrZones) return null;
        
        for (const [key, zone] of Object.entries(this.hrZones)) {
            if (heartRate >= zone.min && heartRate <= zone.max) {
                return zone;
            }
        }
        return null;
    }

    getMinHR() {
        if (this.hrZones) {
            return Math.min(...Object.values(this.hrZones).map(z => z.min)) - 10;
        }
        return 50; // Default min
    }

    getMaxHR() {
        if (this.hrZones) {
            return Math.max(...Object.values(this.hrZones).map(z => z.max)) + 10;
        }
        return 200; // Default max
    }

    updateUserProfile(userProfile) {
        this.userProfile = userProfile;
        this.calculateHRZones();
        
        // Re-render if chart exists
        if (this.chart) {
            this.chart.options = this.getChartOptions();
            this.chart.update();
        }
    }

    getStats(hrData) {
        if (!hrData?.data?.length) return null;

        const includedPoints = hrData.data.filter(point => !point.excluded);
        const excludedPoints = hrData.data.filter(point => point.excluded);
        
        if (includedPoints.length === 0) return null;

        const heartRates = includedPoints.map(p => p.heart_rate);
        const avgHR = Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length);
        const maxHR = Math.max(...heartRates);
        const minHR = Math.min(...heartRates);

        let zoneDistribution = null;
        if (this.hrZones) {
            zoneDistribution = {};
            Object.keys(this.hrZones).forEach(zone => {
                zoneDistribution[zone] = 0;
            });
            
            heartRates.forEach(hr => {
                const zone = this.getHRZone(hr);
                if (zone) {
                    const zoneKey = Object.keys(this.hrZones).find(k => this.hrZones[k] === zone);
                    if (zoneKey) {
                        zoneDistribution[zoneKey]++;
                    }
                }
            });
            
            // Convert to percentages
            Object.keys(zoneDistribution).forEach(zone => {
                zoneDistribution[zone] = Math.round((zoneDistribution[zone] / heartRates.length) * 100);
            });
        }

        return {
            avgHR,
            maxHR,
            minHR,
            totalPoints: hrData.data.length,
            includedPoints: includedPoints.length,
            excludedPoints: excludedPoints.length,
            exclusionRate: Math.round((excludedPoints.length / hrData.data.length) * 100),
            zoneDistribution
        };
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.canvas = null;
    }
}