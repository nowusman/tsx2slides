import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Clock, TrendingUp, Users, Zap, Award, BarChart3 } from 'lucide-react';

const AwardSlides = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Before & After: Governance Transformation",
      content: "BeforeAfter"
    },
    {
      title: "Impact Dashboard: Q2-Q4 2025 Deployed Evidence",
      content: "Dashboard"
    }
  ];

  const BeforeAfterContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Architecture Governance Transformation</h2>
        <p className="text-lg text-gray-600">From Manual Bottleneck to AI-Accelerated Excellence</p>
      </div>

      {/* Main Comparison */}
      <div className="flex-1 grid grid-cols-2 gap-8">
        {/* BEFORE */}
        <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-500 text-white p-3 rounded-lg">
              <Clock size={28} />
            </div>
            <h3 className="text-2xl font-bold text-red-800">BEFORE: Manual Process</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold text-gray-800">Design Submission</p>
                  <p className="text-sm text-gray-600">Architect submits solution for review</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-red-400">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-semibold text-gray-800">Expert Queue</p>
                  <p className="text-sm text-gray-600">Wait for senior architect availability</p>
                  <p className="text-xs text-red-600 font-semibold mt-1">⏱ 1-3 days wait time</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-red-400">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold text-gray-800">Manual Standards Check</p>
                  <p className="text-sm text-gray-600">Search TM Forum specs, compare APIs, check DRA alignment</p>
                  <p className="text-xs text-red-600 font-semibold mt-1">⏱ 4 hours per review</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-red-400">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">4</div>
                <div>
                  <p className="font-semibold text-gray-800">Variable Quality Output</p>
                  <p className="text-sm text-gray-600">Depends on reviewer knowledge & time pressure</p>
                  <p className="text-xs text-red-600 font-semibold mt-1">📊 80-90% accuracy, 11 avg comments</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-red-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800">⚠️ Key Problems:</p>
            <ul className="text-xs text-red-700 mt-2 space-y-1">
              <li>• Governance bottleneck delays delivery</li>
              <li>• Inconsistent TM Forum conformance</li>
              <li>• Expert capacity constraint</li>
              <li>• Technical debts detected late</li>
            </ul>
          </div>
        </div>

        {/* AFTER */}
        <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-500 text-white p-3 rounded-lg">
              <Zap size={28} />
            </div>
            <h3 className="text-2xl font-bold text-green-800">AFTER: AI-Assisted Process</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold text-gray-800">Design Submission</p>
                  <p className="text-sm text-gray-600">Architect submits solution for review</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-green-400">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold flex-shrink-0">2</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">🤖 AI Assistant Pre-Analysis</p>
                  <p className="text-sm text-gray-600">Automated TM Forum API comparison, DRA check, TD detection</p>
                  <p className="text-xs text-green-600 font-semibold mt-1">⚡ Completes in minutes</p>
                  <div className="mt-2 bg-green-50 rounded p-2">
                    <p className="text-xs text-green-700">✓ TMF Swagger/Schema verified</p>
                    <p className="text-xs text-green-700">✓ Product/Order model checked</p>
                    <p className="text-xs text-green-700">✓ Technical debts flagged</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-green-400">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold text-gray-800">Expert Review (Focused)</p>
                  <p className="text-sm text-gray-600">Architect reviews AI findings, adds judgment & context</p>
                  <p className="text-xs text-green-600 font-semibold mt-1">⏱ Under 45 minutes total</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-green-400">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold flex-shrink-0">4</div>
                <div>
                  <p className="font-semibold text-gray-800">Consistent High-Quality Output</p>
                  <p className="text-sm text-gray-600">Standards-aligned every time</p>
                  <p className="text-xs text-green-600 font-semibold mt-1">📊 90-95% accuracy, 20 avg comments</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-green-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800">✅ Key Benefits:</p>
            <ul className="text-xs text-green-700 mt-2 space-y-1">
              <li>• 70-80% time savings per review</li>
              <li>• Systematic TM Forum conformance</li>
              <li>• Scales expert capacity 2x</li>
              <li>• Early detection of issues</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Impact Strip */}
      <div className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold">90%</p>
            <p className="text-sm opacity-90">Faster Reviews</p>
            <p className="text-xs opacity-75">(1-3 days → 1-3 hours)</p>
          </div>
          <div>
            <p className="text-3xl font-bold">95%</p>
            <p className="text-sm opacity-90">Review Accuracy</p>
            <p className="text-xs opacity-75">(vs 80-90% manual)</p>
          </div>
          <div>
            <p className="text-3xl font-bold">82%</p>
            <p className="text-sm opacity-90">More Coverage</p>
            <p className="text-xs opacity-75">(20 vs 11 comments)</p>
          </div>
        </div>
      </div>
    </div>
  );

  const DashboardContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Impact Dashboard: Q2-Q4 2025 Deployed Evidence</h2>
        <p className="text-lg text-gray-600">Production Deployment with Measurable Business Impact</p>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-3 gap-4">
        {/* Left Column - Key Metrics */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={32} />
              <div className="flex-1">
                <p className="text-sm opacity-90">Review Time Reduction</p>
                <p className="text-4xl font-bold">70-80%</p>
              </div>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3 text-sm">
              <p className="font-semibold">4 hours → 45 minutes</p>
              <p className="text-xs opacity-90 mt-1">Per governance review cycle</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={32} />
              <div className="flex-1">
                <p className="text-sm opacity-90">Review Accuracy</p>
                <p className="text-4xl font-bold">90-95%</p>
              </div>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-lg p-3 text-sm">
              <p className="font-semibold">From 80-90% manual</p>
              <p className="text-xs opacity-90 mt-1">With deeper coverage (11→20 comments)</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp size={32} />
              <div className="flex-1">
                <p className="text-sm opacity-90">Asset Disposal Accuracy</p>
                <p className="text-4xl font-bold">{'>95%'}</p>
              </div>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-lg p-3 text-sm">
              <p className="font-semibold">3 FTE workload automated</p>
              <p className="text-xs opacity-90 mt-1">Now fully deployed (beyond POC)</p>
            </div>
          </div>
        </div>

        {/* Middle Column - Deployment Scale */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border-2 border-gray-200 shadow-lg h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-500 text-white p-3 rounded-lg">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Deployment Scale</h3>
            </div>

            <div className="space-y-4 flex-1">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-3xl font-bold text-orange-600 mb-1">5</p>
                <p className="text-sm font-semibold text-gray-800">AI Assistants Live</p>
                <p className="text-xs text-gray-600 mt-1">TAD Review, RFP Analysis, Documentation, Asset Disposal, Vendor Assessment</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-3xl font-bold text-orange-600 mb-1">13</p>
                <p className="text-sm font-semibold text-gray-800">BE Domain Architects</p>
                <p className="text-xs text-gray-600 mt-1">Extended beyond TSA/TAD to Business Enablement teams</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-3xl font-bold text-orange-600 mb-1">7</p>
                <p className="text-sm font-semibold text-gray-800">Use Cases in Pipeline</p>
                <p className="text-xs text-gray-600 mt-1">OSS agents, metadata, data quality, BI reporting planned for 2026</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-3xl font-bold text-orange-600 mb-1">~1 wk</p>
                <p className="text-sm font-semibold text-gray-800">New Agent Launch Time</p>
                <p className="text-xs text-gray-600 mt-1">Using Agent Development Framework with curated knowledge</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - TM Forum Integration */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border-2 border-indigo-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-500 text-white p-3 rounded-lg">
                <Award size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">TM Forum ODA Integration</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-800 mb-1">🔗 Open APIs & Conformance</p>
                <p className="text-xs text-gray-700">Automated TMF swagger/schema comparison during design reviews</p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-800 mb-1">📊 SID & EPC Structures</p>
                <p className="text-xs text-gray-700">Documentation generated with TMF Information Framework vocabulary</p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-800 mb-1">✅ Product & Order Model</p>
                <p className="text-xs text-gray-700">TMF 620/622 pattern verification embedded in compliance checks</p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-800 mb-1">🏗️ DRA Principles</p>
                <p className="text-xs text-gray-700">DRA-aligned vocabulary enforced across all architecture artifacts</p>
              </div>
            </div>

            <div className="mt-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-900 mb-2">💬 Stakeholder Feedback:</p>
              <p className="text-xs italic text-indigo-800">"Very helpful and efficient in comparing TMF swagger/TMF schema. Pin pointing TDs and ABs."</p>
              <p className="text-xs text-indigo-600 mt-1">— TSA Architect</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 size={28} />
              <div className="flex-1">
                <p className="text-sm opacity-90">RFP Review Speed</p>
                <p className="text-4xl font-bold">3x</p>
              </div>
            </div>
            <div className="bg-teal-400 bg-opacity-30 rounded-lg p-3 text-sm">
              <p className="font-semibold">Faster procurement cycles</p>
              <p className="text-xs opacity-90 mt-1">Identifies gaps missed by manual review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="mt-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500 rounded-full p-3">
              <Award size={32} />
            </div>
            <div>
              <p className="text-lg font-bold">Full Year Deployed Evidence: Q2-Q4 2025</p>
              <p className="text-sm opacity-90">Production use across TSA, TAD, and BE architecture teams • Patent application in progress</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Framework Status</p>
            <p className="text-lg font-bold">✅ IBM Certified</p>
            <p className="text-xs opacity-75">GenAI Reference Architecture</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Slide Container */}
      <div className="flex-1 p-8">
        <div className="max-w-[1400px] mx-auto h-full bg-white rounded-2xl shadow-2xl p-8">
          {currentSlide === 0 ? <BeforeAfterContent /> : <DashboardContent />}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  currentSlide === idx ? 'bg-blue-600 w-8' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Slide {currentSlide + 1} of {slides.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white p-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Award size={20} />
            <span className="font-semibold">TM Forum Excellence Award 2026 • Excellence in AI & Data for Business Impact</span>
          </div>
          <div className="text-right opacity-90">
            <p className="font-semibold">stc Technology Strategy & Architecture</p>
            <p className="text-xs">GenAI Assistants for Architecture Governance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardSlides;
