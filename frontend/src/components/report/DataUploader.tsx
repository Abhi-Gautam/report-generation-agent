    setParsedData(null);
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Column 1', 'Column 2', 'Column 3'],
      ['Sample Data 1', 'Sample Data 2', 'Sample Data 3'],
      ['Example 1', 'Example 2', 'Example 3']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'data_template.xlsx');
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {uploadedFiles.length === 0 && (
        <Card className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            
            {isDragActive ? (
              <p className="text-blue-600">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag and drop a data file here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports CSV, Excel (.xlsx, .xls) files up to {Math.round(maxSize / 1024 / 1024)}MB
                </p>
                <Button variant="outline">
                  Choose File
                </Button>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              Download Template
            </Button>
          </div>
        </Card>
      )}

      {/* Processing State */}
      {isProcessing && (
        <Card className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing file...</p>
          </div>
        </Card>
      )}

      {/* Uploaded File */}
      {uploadedFiles.length > 0 && !isProcessing && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">{uploadedFiles[0].name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadedFiles[0].size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeFile}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Data Preview */}
      {parsedData && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Table className="w-4 h-4" />
              Data Preview
            </h3>
            <span className="text-sm text-gray-500">
              {parsedData.data.length} rows × {parsedData.headers.length} columns
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  {parsedData.headers.map((header, index) => (
                    <th key={index} className="text-left p-2 font-medium bg-gray-50">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.data.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b">
                    {parsedData.headers.map((header, colIndex) => (
                      <td key={colIndex} className="p-2 border-r">
                        {String(row[header] || '').substring(0, 50)}
                        {String(row[header] || '').length > 50 && '...'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {parsedData.data.length > 5 && (
            <p className="text-sm text-gray-500 mt-2">
              Showing first 5 rows of {parsedData.data.length} total rows
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
