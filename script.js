// -------------------------------------------------------------
// Interactive JavaScript Engine: Bar Graph vs. Histogram
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        dataType: 'discrete', // 'discrete' or 'continuous'
        selectedDatasetId: '',
        binCount: 8,
        rawValues: [], // Holds raw numbers for continuous data
        chartData: [],  // Formatted data ready for plotting [{ label, value, min, max }]
        quiz: {
            currentQuestion: 0,
            score: 0,
            answered: false,
            questions: [
                {
                    text: "You are preparing a dataset of housing prices for regression and want to check if the target variable is skewed or has heavy tails. Which visualization is best?",
                    options: [
                        "Bar Graph, because housing prices can be grouped by neighborhood.",
                        "Histogram, because housing prices are continuous and you need to see their distribution shape.",
                        "Bar Graph, because it will let you sort the houses from cheapest to most expensive.",
                        "Neither, ML models do not require visualizing continuous variables."
                    ],
                    correctIndex: 1,
                    explanation: "Housing prices are continuous numerical data. A histogram groups these values into continuous bins (e.g., $100k-$150k), allowing you to check for skewness and decide if scaling or log-transformation is needed."
                },
                {
                    text: "You suspect your Fraud Detection model has poor accuracy because the training set is imbalanced (99% normal transactions, 1% fraud). Which chart would you use to verify this class imbalance?",
                    options: [
                        "Histogram, since transaction frequency is a continuous variable.",
                        "Bar Graph, because 'Fraudulent' and 'Normal' are distinct discrete categories.",
                        "Histogram, because you need to see if the fraud transactions occur adjacent to normal ones.",
                        "Bar Graph, but you must make sure the bars touch to show the transactions are related."
                    ],
                    correctIndex: 1,
                    explanation: "Target labels ('Fraudulent' vs. 'Normal') are discrete, categorical classes. A bar graph with spaces between the bars is the correct tool to compare discrete category counts."
                },
                {
                    text: "In your Random Forest classification output, you receive a list of importance scores for 10 features. How would you display this visually to interpret which features to keep?",
                    options: [
                        "Histogram, with 10 bins representing the feature importance intervals.",
                        "Bar Graph, with 10 separate bars representing each discrete feature and its score.",
                        "Histogram, because feature importance is a continuous score and the bars must touch.",
                        "Line graph, showing the chronological trend of feature importances."
                    ],
                    correctIndex: 1,
                    explanation: "Each feature (e.g., 'Age', 'Income', 'Credit Score') is an independent discrete category. A bar graph (often horizontal) is used to plot and compare their individual scores."
                }
            ]
        }
    };

    // --- REFS ---
    const refs = {
        btnSelectDiscrete: document.getElementById('btnSelectDiscrete'),
        btnSelectContinuous: document.getElementById('btnSelectContinuous'),
        selectDataset: document.getElementById('selectDataset'),
        binControlContainer: document.getElementById('binControlContainer'),
        inputBins: document.getElementById('inputBins'),
        binCountDisplay: document.getElementById('binCountDisplay'),
        txtDatasetDesc: document.getElementById('txtDatasetDesc'),
        txtDataSample: document.getElementById('txtDataSample'),
        btnRegenerateData: document.getElementById('btnRegenerateData'),
        
        chartTypeBadge: document.getElementById('chartTypeBadge'),
        chartTitle: document.getElementById('chartTitle'),
        legendDot: document.getElementById('legendDot'),
        interactiveChartContainer: document.getElementById('interactiveChartContainer'),
        chartExplanation: document.getElementById('chartExplanation'),
        
        tabHistBtn: document.getElementById('tabHistBtn'),
        tabBarBtn: document.getElementById('tabBarBtn'),
        tabHistContent: document.getElementById('tab-hist'),
        tabBarContent: document.getElementById('tab-bar'),
        
        quizPlayArea: document.getElementById('quizPlayArea'),
        quizResultArea: document.getElementById('quizResultArea'),
        quizProgressFill: document.getElementById('quizProgressFill'),
        lblQuestionNumber: document.getElementById('lblQuestionNumber'),
        lblCurrentScore: document.getElementById('lblCurrentScore'),
        txtQuestionText: document.getElementById('txtQuestionText'),
        containerQuizOptions: document.getElementById('containerQuizOptions'),
        boxQuizFeedback: document.getElementById('boxQuizFeedback'),
        txtFeedbackTitle: document.getElementById('txtFeedbackTitle'),
        txtFeedbackDesc: document.getElementById('txtFeedbackDesc'),
        iconQuizFeedback: document.getElementById('iconQuizFeedback'),
        btnNextQuestion: document.getElementById('btnNextQuestion'),
        txtFinalScore: document.getElementById('txtFinalScore'),
        txtResultVerdict: document.getElementById('txtResultVerdict'),
        btnRestartQuiz: document.getElementById('btnRestartQuiz')
    };

    // --- DATASETS DEFINITION ---
    const DATASETS = {
        discrete: [
            {
                id: 'frameworks',
                name: 'Popular ML Frameworks',
                desc: 'Represents the survey responses of ML developers selecting their primary framework. Each framework is a distinct, independent category.',
                generate: () => [
                    { label: 'Scikit-Learn', value: 85 },
                    { label: 'PyTorch', value: 78 },
                    { label: 'TensorFlow', value: 55 },
                    { label: 'XGBoost', value: 68 },
                    { label: 'Hugging Face', value: 62 },
                    { label: 'JAX', value: 24 }
                ]
            },
            {
                id: 'imbalance',
                name: 'Target Class Distribution (Credit Card Fraud)',
                desc: 'Compares the volume of legitimate versus fraudulent transactions in an imbalanced dataset. Highlights class imbalance before training models.',
                generate: () => [
                    { label: 'Legitimate (Class 0)', value: 198 },
                    { label: 'Fraudulent (Class 1)', value: 8 }
                ]
            },
            {
                id: 'metrics',
                name: 'Model Comparisons (F1-Score %)',
                desc: 'Evaluates and compares the F1 performance scores across different trained classifiers on a verification set.',
                generate: () => [
                    { label: 'Logistic Reg.', value: 74 },
                    { label: 'SVM', value: 81 },
                    { label: 'Random Forest', value: 89 },
                    { label: 'XGBoost Classifier', value: 92 },
                    { label: 'Neural Network', value: 90 }
                ]
            }
        ],
        continuous: [
            {
                id: 'residuals',
                name: 'Regression Residuals (Prediction Errors)',
                desc: 'Continuous estimation errors (True Value - Predicted Value) from a house price regression model. A normal bell-shaped distribution centered around 0 suggests an unbiased model.',
                range: { min: -5, max: 5 },
                generateRaw: () => {
                    // Generate normal distribution using Box-Muller transform
                    const values = [];
                    for (let i = 0; i < 220; i++) {
                        let u = 0, v = 0;
                        while(u === 0) u = Math.random(); 
                        while(v === 0) v = Math.random();
                        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                        num = num * 1.5; // Stdev = 1.5, Mean = 0
                        // Clip outliers for visual neatness
                        if (num >= -5 && num <= 5) {
                            values.push(parseFloat(num.toFixed(2)));
                        } else {
                            i--; // retry
                        }
                    }
                    return values;
                }
            },
            {
                id: 'house_prices',
                name: 'Housing Prices (in Thousands $)',
                desc: 'Continuous prices of homes in a suburb. Features a strong right skew (log-normal shape) indicating that most houses are moderately priced, with a few extremely expensive mansions.',
                range: { min: 80, max: 800 },
                generateRaw: () => {
                    const values = [];
                    for (let i = 0; i < 200; i++) {
                        // Log-normal distribution simulation
                        const normal = Math.sqrt(-2.0 * Math.log(Math.random() || 0.001)) * Math.cos(2.0 * Math.PI * (Math.random() || 0.001));
                        // scale and exponentiate
                        const logVal = normal * 0.45 + 5.5; // parameters to shape between ~80 and ~800
                        const val = Math.exp(logVal);
                        if (val >= 80 && val <= 800) {
                            values.push(Math.round(val));
                        } else {
                            i--;
                        }
                    }
                    return values.sort((a,b) => a - b);
                }
            },
            {
                id: 'pixel_intensities',
                name: 'Image Preprocessing: Pixel Intensities (0 - 255)',
                desc: 'A continuous spectrum of gray-scale levels (0 = Pure Black, 255 = Pure White) from an input image. Used in Computer Vision to adjust contrast (histogram equalization) before feeding to a CNN.',
                range: { min: 0, max: 255 },
                generateRaw: () => {
                    const values = [];
                    // Generate a bimodal distribution (dark background and bright foreground subject)
                    for (let i = 0; i < 200; i++) {
                        if (Math.random() < 0.6) {
                            // Dark pixels peak around 60
                            const val = Math.round(60 + (Math.random() - 0.5) * 40);
                            values.push(Math.min(Math.max(val, 0), 255));
                        } else {
                            // Light pixels peak around 190
                            const val = Math.round(190 + (Math.random() - 0.5) * 60);
                            values.push(Math.min(Math.max(val, 0), 255));
                        }
                    }
                    return values.sort((a,b) => a - b);
                }
            }
        ]
    };

    // --- INITIALIZATION ---
    function init() {
        setupEventListeners();
        loadDatasetOptions();
        regenerateActiveData();
        renderActiveChart();
        loadQuizQuestion();
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Toggle Buttons (Discrete vs Continuous)
        refs.btnSelectDiscrete.addEventListener('click', () => setDataType('discrete'));
        refs.btnSelectContinuous.addEventListener('click', () => setDataType('continuous'));

        // Dropdown selection change
        refs.selectDataset.addEventListener('change', (e) => {
            state.selectedDatasetId = e.target.value;
            regenerateActiveData();
            renderActiveChart();
        });

        // Bins input slider
        refs.inputBins.addEventListener('input', (e) => {
            state.binCount = parseInt(e.target.value);
            refs.binCountDisplay.textContent = state.binCount;
            processContinuousData();
            renderActiveChart();
        });

        // Regenerate Data Button
        refs.btnRegenerateData.addEventListener('click', () => {
            regenerateActiveData();
            renderActiveChart();
        });

        // ML Tab Switching
        refs.tabHistBtn.addEventListener('click', () => switchMLTab('hist'));
        refs.tabBarBtn.addEventListener('click', () => switchMLTab('bar'));

        // Quiz buttons
        refs.btnNextQuestion.addEventListener('click', handleNextQuizQuestion);
        refs.btnRestartQuiz.addEventListener('click', restartQuiz);
    }

    // --- STATE CHANGES ---
    function setDataType(type) {
        if (state.dataType === type) return;
        
        state.dataType = type;
        if (type === 'discrete') {
            refs.btnSelectDiscrete.classList.add('active');
            refs.btnSelectContinuous.classList.remove('active');
            refs.binControlContainer.style.display = 'none';
            refs.chartTypeBadge.textContent = 'Bar Graph';
            refs.chartTypeBadge.className = 'badge bg-bar-dim';
            refs.legendDot.style.backgroundColor = 'var(--color-bar)';
        } else {
            refs.btnSelectDiscrete.classList.remove('active');
            refs.btnSelectContinuous.classList.add('active');
            refs.binControlContainer.style.display = 'flex';
            refs.chartTypeBadge.textContent = 'Histogram';
            refs.chartTypeBadge.className = 'badge bg-hist-dim';
            refs.legendDot.style.backgroundColor = 'var(--color-hist)';
        }

        loadDatasetOptions();
        regenerateActiveData();
        renderActiveChart();
    }

    function loadDatasetOptions() {
        refs.selectDataset.innerHTML = '';
        const list = DATASETS[state.dataType];
        list.forEach(ds => {
            const opt = document.createElement('option');
            opt.value = ds.id;
            opt.textContent = ds.name;
            refs.selectDataset.appendChild(opt);
        });
        state.selectedDatasetId = list[0].id;
    }

    function regenerateActiveData() {
        const dsList = DATASETS[state.dataType];
        const ds = dsList.find(d => d.id === state.selectedDatasetId);
        
        if (!ds) return;
        
        refs.txtDatasetDesc.textContent = ds.desc;
        refs.chartTitle.textContent = ds.name;

        if (state.dataType === 'discrete') {
            state.chartData = ds.generate();
            // Show formatted preview
            const previewText = JSON.stringify(state.chartData.reduce((acc, curr) => {
                acc[curr.label] = curr.value;
                return acc;
            }, {}), null, 2);
            refs.txtDataSample.textContent = previewText;
        } else {
            state.rawValues = ds.generateRaw();
            // Show sample preview
            refs.txtDataSample.textContent = `[ ${state.rawValues.slice(0, 12).join(', ')} ... + ${state.rawValues.length - 12} more values ]`;
            processContinuousData();
        }
    }

    // Binning logic for histograms
    function processContinuousData() {
        const ds = DATASETS.continuous.find(d => d.id === state.selectedDatasetId);
        if (!ds) return;

        const valMin = ds.range.min;
        const valMax = ds.range.max;
        const totalRange = valMax - valMin;
        const width = totalRange / state.binCount;

        // Initialize bins
        const bins = [];
        for (let i = 0; i < state.binCount; i++) {
            const start = valMin + i * width;
            const end = start + width;
            bins.push({
                min: start,
                max: end,
                label: `[${start.toFixed(0)}-${end.toFixed(0)}]`,
                value: 0
            });
        }

        // Count values in each bin
        state.rawValues.forEach(val => {
            let placed = false;
            for (let i = 0; i < state.binCount; i++) {
                // If it's the last bin, include the max boundary
                const isLastBin = (i === state.binCount - 1);
                if (val >= bins[i].min && (isLastBin ? val <= bins[i].max : val < bins[i].max)) {
                    bins[i].value++;
                    placed = true;
                    break;
                }
            }
        });

        state.chartData = bins;
    }

    // --- ML PIPELINE TABS ---
    function switchMLTab(target) {
        if (target === 'hist') {
            refs.tabHistBtn.classList.add('active');
            refs.tabBarBtn.classList.remove('active');
            refs.tabHistContent.classList.add('active');
            refs.tabBarContent.classList.remove('active');
        } else {
            refs.tabHistBtn.classList.remove('active');
            refs.tabBarBtn.classList.add('active');
            refs.tabHistContent.classList.remove('active');
            refs.tabBarContent.classList.add('active');
        }
    }

    // --- SVG PLOTTING ENGINE (VIBRANT & INTERACTIVE) ---
    function renderActiveChart() {
        const container = refs.interactiveChartContainer;
        container.innerHTML = ''; // Clear canvas

        const containerWidth = container.clientWidth || 600;
        const containerHeight = container.clientHeight || 340;

        // SVG Dimensions
        const width = containerWidth;
        const height = containerHeight;
        const padding = { top: 30, right: 30, bottom: 50, left: 55 };

        // Core data variables
        const maxVal = Math.max(...state.chartData.map(d => d.value), 10);
        // Add 15% headroom to top of chart
        const yMax = Math.ceil(maxVal * 1.15); 
        
        // Create base SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.overflow = 'visible';

        // Add Definitions for gradients
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Gradient for discrete bars (pink)
        const barGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        barGrad.setAttribute('id', 'barGradient');
        barGrad.setAttribute('x1', '0%');
        barGrad.setAttribute('y1', '0%');
        barGrad.setAttribute('x2', '0%');
        barGrad.setAttribute('y2', '100%');
        barGrad.innerHTML = `
            <stop offset="0%" stop-color="var(--color-bar)" />
            <stop offset="100%" stop-color="var(--color-bar-secondary)" />
        `;
        defs.appendChild(barGrad);

        // Gradient for continuous bars (yellow/cyan)
        const histGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        histGrad.setAttribute('id', 'histGradient');
        histGrad.setAttribute('x1', '0%');
        histGrad.setAttribute('y1', '0%');
        histGrad.setAttribute('x2', '0%');
        histGrad.setAttribute('y2', '100%');
        histGrad.innerHTML = `
            <stop offset="0%" stop-color="var(--color-hist)" />
            <stop offset="100%" stop-color="var(--color-hist-secondary)" />
        `;
        defs.appendChild(histGrad);
        
        svg.appendChild(defs);

        // --- GRID LINES ---
        const tickCount = 5;
        for (let i = 0; i <= tickCount; i++) {
            const gridVal = (yMax / tickCount) * i;
            const y = height - padding.bottom - ((height - padding.top - padding.bottom) / yMax) * gridVal;
            
            // Grid line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', padding.left);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width - padding.right);
            line.setAttribute('y2', y);
            line.setAttribute('class', 'grid-line');
            svg.appendChild(line);

            // Y Label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', padding.left - 12);
            text.setAttribute('y', y + 4);
            text.setAttribute('class', 'chart-label');
            text.setAttribute('text-anchor', 'end');
            text.textContent = Math.round(gridVal);
            svg.appendChild(text);
        }

        // Y-axis Label Title (rotated)
        const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yTitle.setAttribute('transform', `rotate(-90)`);
        yTitle.setAttribute('x', -(height - padding.top - padding.bottom) / 2 - padding.top);
        yTitle.setAttribute('y', 18);
        yTitle.setAttribute('class', 'chart-label-title');
        yTitle.setAttribute('text-anchor', 'middle');
        yTitle.textContent = state.dataType === 'discrete' ? 'Sample Count' : 'Frequency';
        svg.appendChild(yTitle);

        // --- AXIS PATHS ---
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', padding.left);
        xAxis.setAttribute('y1', height - padding.bottom);
        xAxis.setAttribute('x2', width - padding.right);
        xAxis.setAttribute('y2', height - padding.bottom);
        xAxis.setAttribute('class', 'axis-line');
        svg.appendChild(xAxis);

        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', padding.left);
        yAxis.setAttribute('y1', padding.top);
        yAxis.setAttribute('x2', padding.left);
        yAxis.setAttribute('y2', height - padding.bottom);
        yAxis.setAttribute('class', 'axis-line');
        svg.appendChild(yAxis);

        // --- RENDER BARS ---
        const itemCount = state.chartData.length;
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;
        const slotWidth = graphWidth / itemCount;

        // Custom spacing setup
        let barSpacing = 0;
        let barFill = '';
        let barBorder = '';
        let shadowColor = '';

        if (state.dataType === 'discrete') {
            // Spaces required for discrete
            barSpacing = slotWidth * 0.35; // 35% gap
            barFill = 'url(#barGradient)';
            barBorder = 'rgba(255, 8, 68, 0.6)';
            shadowColor = 'var(--color-bar-glow)';
        } else {
            // NO gaps for continuous/histogram!
            barSpacing = 0;
            barFill = 'url(#histGradient)';
            barBorder = 'rgba(0, 242, 254, 0.4)';
            shadowColor = 'var(--color-hist-glow)';
        }

        const barWidth = slotWidth - barSpacing;

        state.chartData.forEach((d, i) => {
            const x = padding.left + i * slotWidth + (barSpacing / 2);
            const valRatio = d.value / yMax;
            const barHeight = graphHeight * valRatio;
            const y = height - padding.bottom - barHeight;

            // Bar shape
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', Math.max(barHeight, 0)); // Ensure non-negative
            rect.setAttribute('fill', barFill);
            rect.setAttribute('stroke', barBorder);
            rect.setAttribute('stroke-width', '1.2');
            rect.setAttribute('rx', state.dataType === 'discrete' ? '4' : '0'); // Round only discrete bars slightly
            rect.setAttribute('class', 'svg-bar');
            
            // Animated entrance
            const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            anim.setAttribute('attributeName', 'height');
            anim.setAttribute('from', '0');
            anim.setAttribute('to', Math.max(barHeight, 0));
            anim.setAttribute('dur', '0.6s');
            anim.setAttribute('fill', 'freeze');
            rect.appendChild(anim);

            const animY = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animY.setAttribute('attributeName', 'y');
            animY.setAttribute('from', height - padding.bottom);
            animY.setAttribute('to', y);
            animY.setAttribute('dur', '0.6s');
            animY.setAttribute('fill', 'freeze');
            rect.appendChild(animY);

            // Add Mouseover interactions for rich descriptions & tooltips
            rect.addEventListener('mouseenter', (e) => {
                showChartTooltip(d, x + barWidth/2, y, barWidth);
                rect.setAttribute('style', `filter: drop-shadow(0 0 8px ${shadowColor}) brightness(1.1);`);
            });

            rect.addEventListener('mouseleave', () => {
                hideChartTooltip();
                rect.setAttribute('style', '');
            });

            svg.appendChild(rect);

            // X Labels (ticks & labels)
            const labelX = x + barWidth / 2;
            const labelY = height - padding.bottom + 18;

            // Render minor tick line
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', labelX);
            tick.setAttribute('y1', height - padding.bottom);
            tick.setAttribute('x2', labelX);
            tick.setAttribute('y2', height - padding.bottom + 5);
            tick.setAttribute('class', 'axis-tick');
            svg.appendChild(tick);

            // Render Text Label (truncate if discrete name is long)
            const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            xLabel.setAttribute('x', labelX);
            xLabel.setAttribute('y', labelY);
            xLabel.setAttribute('class', 'chart-label');
            xLabel.setAttribute('text-anchor', 'middle');
            
            let labelText = d.label;
            if (state.dataType === 'discrete' && labelText.length > 12) {
                labelText = labelText.substring(0, 10) + '..';
            }
            xLabel.textContent = labelText;
            
            // Rotate labels slightly if they are cramped
            if (itemCount > 8 || state.dataType === 'continuous') {
                xLabel.setAttribute('transform', `rotate(-15, ${labelX}, ${labelY})`);
                xLabel.setAttribute('y', labelY + 3);
            }

            svg.appendChild(xLabel);
        });

        // X-axis label Title
        const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xTitle.setAttribute('x', padding.left + graphWidth / 2);
        xTitle.setAttribute('y', height - 8);
        xTitle.setAttribute('class', 'chart-label-title');
        xTitle.setAttribute('text-anchor', 'middle');
        xTitle.textContent = state.dataType === 'discrete' ? 'Categorical Features' : 'Continuous Value Intervals (Bins)';
        svg.appendChild(xTitle);

        container.appendChild(svg);
        updateChartExplanation(null);
    }

    // Dynamic inside-chart tooltip
    let activeTooltipGroup = null;

    function showChartTooltip(data, barCenterX, barTopY, barWidth) {
        const svg = refs.interactiveChartContainer.querySelector('svg');
        if (!svg) return;

        // Remove existing tooltip if present
        if (activeTooltipGroup) {
            activeTooltipGroup.remove();
        }

        activeTooltipGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Tooltip dimensions
        const boxWidth = 140;
        const boxHeight = 50;
        const cornerRadius = 6;
        
        // Position offset (draw above the bar)
        let tx = barCenterX - boxWidth / 2;
        let ty = barTopY - boxHeight - 12;

        // Boundary adjustments
        if (tx < 55) tx = 55;
        if (tx + boxWidth > svg.clientWidth - 20) tx = svg.clientWidth - boxWidth - 20;
        if (ty < 5) ty = barTopY + 12; // Draw below if cramped at top

        // Background box
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', tx);
        rect.setAttribute('y', ty);
        rect.setAttribute('width', boxWidth);
        rect.setAttribute('height', boxHeight);
        rect.setAttribute('rx', cornerRadius);
        rect.setAttribute('class', 'svg-tooltip-bg');
        activeTooltipGroup.appendChild(rect);

        // Header text (Category or Range)
        const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t1.setAttribute('x', tx + 10);
        t1.setAttribute('y', ty + 18);
        t1.setAttribute('class', 'svg-tooltip-text');
        t1.textContent = state.dataType === 'discrete' ? 'Category:' : 'Interval Range:';
        activeTooltipGroup.appendChild(t1);

        const t1Val = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t1Val.setAttribute('x', tx + boxWidth - 10);
        t1Val.setAttribute('y', ty + 18);
        t1Val.setAttribute('class', 'svg-tooltip-bold svg-tooltip-text');
        t1Val.setAttribute('text-anchor', 'end');
        t1Val.textContent = state.dataType === 'discrete' ? data.label : `${data.min.toFixed(0)} - ${data.max.toFixed(0)}`;
        activeTooltipGroup.appendChild(t1Val);

        // Value text
        const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t2.setAttribute('x', tx + 10);
        t2.setAttribute('y', ty + 38);
        t2.setAttribute('class', 'svg-tooltip-text');
        t2.textContent = state.dataType === 'discrete' ? 'Value Count:' : 'Frequency:';
        activeTooltipGroup.appendChild(t2);

        const t2Val = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t2Val.setAttribute('x', tx + boxWidth - 10);
        t2Val.setAttribute('y', ty + 38);
        t2Val.setAttribute('class', 'svg-tooltip-bold svg-tooltip-text');
        t2Val.setAttribute('text-anchor', 'end');
        
        let percentage = '';
        if (state.dataType === 'continuous') {
            const pct = (data.value / state.rawValues.length) * 100;
            percentage = ` (${pct.toFixed(1)}%)`;
        }
        t2Val.textContent = `${data.value}${percentage}`;
        activeTooltipGroup.appendChild(t2Val);

        svg.appendChild(activeTooltipGroup);
        updateChartExplanation(data);
    }

    function hideChartTooltip() {
        if (activeTooltipGroup) {
            activeTooltipGroup.remove();
            activeTooltipGroup = null;
        }
        updateChartExplanation(null);
    }

    // Informs user on insights below the chart container
    function updateChartExplanation(hoveredData) {
        const exp = refs.chartExplanation;
        if (!hoveredData) {
            if (state.dataType === 'discrete') {
                exp.innerHTML = `<i class="fa-solid fa-circle-info text-bar"></i> <strong>Bar Graph Insight:</strong> Compare individual categories. Notice the deliberate <strong>spaces</strong> separating each bar, proving they are mathematically independent.`;
            } else {
                exp.innerHTML = `<i class="fa-solid fa-circle-info text-hist"></i> <strong>Histogram Insight:</strong> Each bar groups ranges of continuous data. There are <strong>no spaces</strong> because the X-axis is an unbroken, continuous number line. Drag the bin slider to reshape!`;
            }
            return;
        }

        if (state.dataType === 'discrete') {
            exp.innerHTML = `<i class="fa-solid fa-chart-bar text-bar"></i> Category <strong>"${hoveredData.label}"</strong> has a count of <strong>${hoveredData.value}</strong>. These bars can be rearranged in any order without losing meaning.`;
        } else {
            const count = hoveredData.value;
            const pct = ((count / state.rawValues.length) * 100).toFixed(1);
            exp.innerHTML = `<i class="fa-solid fa-chart-area text-hist"></i> There are <strong>${count} samples</strong> (${pct}%) falling between the range <strong>${hoveredData.min.toFixed(1)}</strong> and <strong>${hoveredData.max.toFixed(1)}</strong>.`;
        }
    }

    // --- QUIZ MANAGEMENT ---
    function loadQuizQuestion() {
        state.quiz.answered = false;
        refs.boxQuizFeedback.classList.add('hidden');
        refs.btnNextQuestion.classList.add('hidden');
        
        const qIndex = state.quiz.currentQuestion;
        const totalQs = state.quiz.questions.length;
        
        // Progress display
        refs.lblQuestionNumber.textContent = `Question ${qIndex + 1} of ${totalQs}`;
        refs.lblCurrentScore.textContent = `Score: ${state.quiz.score}`;
        
        const progressPercent = ((qIndex) / totalQs) * 100;
        refs.quizProgressFill.style.width = `${progressPercent}%`;

        const q = state.quiz.questions[qIndex];
        refs.txtQuestionText.textContent = q.text;

        // Generate options buttons
        refs.containerQuizOptions.innerHTML = '';
        q.options.forEach((optText, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt-btn';
            
            const prefixes = ['A', 'B', 'C', 'D'];
            btn.innerHTML = `
                <span class="opt-prefix">${prefixes[index]}</span>
                <span class="opt-text">${optText}</span>
            `;
            
            btn.addEventListener('click', () => handleQuizAnswer(index));
            refs.containerQuizOptions.appendChild(btn);
        });
    }

    function handleQuizAnswer(selectedIndex) {
        if (state.quiz.answered) return;
        state.quiz.answered = true;

        const qIndex = state.quiz.currentQuestion;
        const q = state.quiz.questions[qIndex];
        const isCorrect = (selectedIndex === q.correctIndex);

        // Disable all option buttons
        const optionButtons = refs.containerQuizOptions.querySelectorAll('.quiz-opt-btn');
        optionButtons.forEach((btn, idx) => {
            btn.setAttribute('disabled', 'true');
            if (idx === q.correctIndex) {
                btn.classList.add('correct');
            } else if (idx === selectedIndex) {
                btn.classList.add('incorrect');
            }
        });

        if (isCorrect) {
            state.quiz.score++;
            refs.lblCurrentScore.textContent = `Score: ${state.quiz.score}`;
            
            refs.boxQuizFeedback.className = 'quiz-feedback-box correct-fb';
            refs.txtFeedbackTitle.textContent = "Correct Answer!";
            refs.iconQuizFeedback.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        } else {
            refs.boxQuizFeedback.className = 'quiz-feedback-box incorrect-fb';
            refs.txtFeedbackTitle.textContent = "Incorrect";
            refs.iconQuizFeedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        }

        refs.txtFeedbackDesc.textContent = q.explanation;
        refs.boxQuizFeedback.classList.remove('hidden');

        // Reveal Next/Finish Button
        const totalQs = state.quiz.questions.length;
        if (qIndex === totalQs - 1) {
            refs.btnNextQuestion.innerHTML = `Finish Quiz <i class="fa-solid fa-flag-checkered"></i>`;
        } else {
            refs.btnNextQuestion.innerHTML = `Next Question <i class="fa-solid fa-arrow-right"></i>`;
        }
        refs.btnNextQuestion.classList.remove('hidden');
    }

    function handleNextQuizQuestion() {
        const qIndex = state.quiz.currentQuestion;
        const totalQs = state.quiz.questions.length;

        if (qIndex < totalQs - 1) {
            state.quiz.currentQuestion++;
            loadQuizQuestion();
        } else {
            // Show result screen
            refs.quizProgressFill.style.width = '100%';
            showQuizResults();
        }
    }

    function showQuizResults() {
        refs.quizPlayArea.classList.add('hidden');
        refs.quizResultArea.classList.remove('hidden');
        
        const score = state.quiz.score;
        const total = state.quiz.questions.length;
        refs.txtFinalScore.textContent = `${score} out of ${total}`;

        let verdict = "";
        if (score === total) {
            verdict = "Flawless! You're ready to engineer features and interpret model error distributions like a pro!";
        } else if (score >= total - 1) {
            verdict = "Great job! You have a solid grasp of discrete categories vs continuous range mappings.";
        } else {
            verdict = "Good attempt! Review the definitions above and try again to master these core concepts.";
        }
        refs.txtResultVerdict.textContent = verdict;
    }

    function restartQuiz() {
        state.quiz.currentQuestion = 0;
        state.quiz.score = 0;
        refs.quizResultArea.classList.add('hidden');
        refs.quizPlayArea.classList.remove('hidden');
        loadQuizQuestion();
    }

    // Handles window resizing by redrawing SVG
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderActiveChart();
        }, 150);
    });

    // Start everything
    init();
});
