import { useState } from 'react'
import { FileText, Download, Sparkles, TrendingUp, Lightbulb, BarChart3 } from 'lucide-react'
import { generateReport } from '../services/api'
import { DocumentInfo } from '../types'
import toast from 'react-hot-toast'

interface ReportGeneratorProps {
  documents: DocumentInfo[]
  darkMode: boolean
}

export default function ReportGenerator({ documents, darkMode }: ReportGeneratorProps) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [reportType, setReportType] = useState('comprehensive')
  const [includeVisualizations, setIncludeVisualizations] = useState(true)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)

  const handleGenerate = async () => {
    if (documents.length === 0) {
      toast.error('Please upload documents first')
      return
    }

    setLoading(true)
    try {
      const result = await generateReport({
        document_ids: selectedDocs.length > 0 ? selectedDocs : undefined,
        report_type: reportType,
        include_visualizations: includeVisualizations
      })
      setReport(result)
      toast.success('Report generated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const toggleDocument = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  return (
    <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
          <FileText className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-indigo-600'}`} />
        </div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AI Report Generator
        </h2>
      </div>

      {!report ? (
        <div className="space-y-6">
          {/* Document Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Documents (Leave empty for all documents)
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {documents.map(doc => (
                <label
                  key={doc.document_id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    darkMode
                      ? selectedDocs.includes(doc.document_id)
                        ? 'bg-indigo-900/30 border border-indigo-600'
                        : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                      : selectedDocs.includes(doc.document_id)
                        ? 'bg-indigo-50 border border-indigo-300'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.document_id)}
                    onChange={() => toggleDocument(doc.document_id)}
                    className="w-4 h-4"
                  />
                  <span className={`flex-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {doc.filename}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option value="comprehensive">Comprehensive Report</option>
              <option value="summary">Executive Summary</option>
              <option value="kpi">KPI Analysis</option>
              <option value="insights">Key Insights</option>
            </select>
          </div>

          {/* Options */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVisualizations}
              onChange={(e) => setIncludeVisualizations(e.target.checked)}
              className="w-5 h-5"
            />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              Include Visualization Suggestions
            </span>
          </label>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || documents.length === 0}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              darkMode
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <Sparkles className="w-5 h-5 animate-pulse" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Generate Report
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Generated Report
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {report.metadata?.total_documents} documents analyzed
              </p>
            </div>
            <button
              onClick={() => setReport(null)}
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              New Report
            </button>
          </div>

          {/* Report Sections */}
          {report.sections && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Executive Summary */}
              {report.sections.executive_summary && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Executive Summary
                    </h4>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {report.sections.executive_summary.summary}
                  </p>
                </div>
              )}

              {/* Key Insights */}
              {report.sections.key_insights && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Key Insights ({report.sections.key_insights.count || 0})
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {report.sections.key_insights.insights?.map((insight: string, idx: number) => (
                      <li key={idx} className={`text-sm flex items-start gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-indigo-500 mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KPI Analysis */}
              {report.sections.kpi_analysis && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      KPI Analysis ({report.sections.kpi_analysis.count || 0} metrics)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.sections.kpi_analysis.kpis?.slice(0, 6).map((kpi: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border ${
                          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {kpi.name}
                        </div>
                        <div className={`text-lg font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {kpi.value}
                        </div>
                        {kpi.type && (
                          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {kpi.type}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {report.sections.recommendations && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Recommendations ({report.sections.recommendations.count || 0})
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {report.sections.recommendations.recommendations?.map((rec: any, idx: number) => (
                      <li key={idx} className={`text-sm flex items-start gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={`mt-1 ${rec.priority === 'high' ? 'text-red-500' : 'text-blue-500'}`}>•</span>
                        <span>{rec.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Visualization Suggestions */}
              {report.sections.visualization_suggestions && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Visualization Suggestions
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.sections.visualization_suggestions.map((viz: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border ${
                          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {viz.title}
                        </div>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {viz.description}
                        </div>
                        <div className={`text-xs mt-2 px-2 py-1 rounded inline-block ${
                          darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {viz.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

