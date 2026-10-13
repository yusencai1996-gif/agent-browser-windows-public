${If} ${FileExists} "$INSTDIR\abw.cmd"
ClearErrors
Delete "$INSTDIR\abw.cmd"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\abw.exe"
ClearErrors
Delete "$INSTDIR\abw.exe"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\dist\abw19e-host.exe"
ClearErrors
Delete "$INSTDIR\dist\abw19e-host.exe"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\dist\pipe-gate.exe"
ClearErrors
Delete "$INSTDIR\dist\pipe-gate.exe"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\LICENSE"
ClearErrors
Delete "$INSTDIR\LICENSE"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\licenses\NODE-LICENSE.txt"
ClearErrors
Delete "$INSTDIR\licenses\NODE-LICENSE.txt"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\licenses\SHASUMS256.txt"
ClearErrors
Delete "$INSTDIR\licenses\SHASUMS256.txt"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\licenses\WebView2-LICENSE.txt"
ClearErrors
Delete "$INSTDIR\licenses\WebView2-LICENSE.txt"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\licenses\WebView2-NOTICE.txt"
ClearErrors
Delete "$INSTDIR\licenses\WebView2-NOTICE.txt"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\2019.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\2019.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\2020.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\2020.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\ajv.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\ajv.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\codegen\code.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\codegen\code.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\codegen\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\codegen\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\codegen\scope.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\codegen\scope.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\errors.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\errors.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\jtd\parse.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\jtd\parse.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\jtd\serialize.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\jtd\serialize.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\jtd\types.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\jtd\types.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\names.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\names.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\ref_error.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\ref_error.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\resolve.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\resolve.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\rules.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\rules.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\util.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\util.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\validate\applicability.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\validate\applicability.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\validate\boolSchema.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\validate\boolSchema.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\validate\dataType.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\validate\dataType.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\validate\defaults.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\validate\defaults.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\validate\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\validate\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\validate\keyword.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\validate\keyword.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\compile\validate\subschema.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\compile\validate\subschema.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\core.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\core.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\jtd.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\jtd.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\data.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\data.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\applicator.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\applicator.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\content.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\content.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\core.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\core.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\format.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\format.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\meta-data.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\meta-data.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\validation.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\meta\validation.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\schema.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2019-09\schema.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\applicator.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\applicator.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\content.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\content.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\core.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\core.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\format-annotation.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\format-annotation.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\meta-data.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\meta-data.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\unevaluated.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\unevaluated.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\validation.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\meta\validation.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\schema.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-2020-12\schema.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-draft-06.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-draft-06.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-draft-07.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-draft-07.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\json-schema-secure.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\json-schema-secure.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\refs\jtd-schema.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\refs\jtd-schema.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\equal.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\equal.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\parseJson.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\parseJson.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\quote.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\quote.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\re2.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\re2.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\timestamp.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\timestamp.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\ucs2length.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\ucs2length.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\uri.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\uri.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\runtime\validation_error.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\runtime\validation_error.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\standalone\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\standalone\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\standalone\instance.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\standalone\instance.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\types\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\types\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\types\json-schema.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\types\json-schema.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\types\jtd-schema.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\types\jtd-schema.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\additionalItems.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\additionalItems.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\additionalProperties.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\additionalProperties.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\allOf.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\allOf.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\anyOf.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\anyOf.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\contains.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\contains.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\dependencies.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\dependencies.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\dependentSchemas.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\dependentSchemas.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\if.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\if.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\items.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\items.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\items2020.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\items2020.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\not.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\not.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\oneOf.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\oneOf.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\patternProperties.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\patternProperties.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\prefixItems.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\prefixItems.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\properties.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\properties.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\propertyNames.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\propertyNames.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\thenElse.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\applicator\thenElse.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\code.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\code.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\core\id.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\core\id.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\core\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\core\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\core\ref.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\core\ref.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\discriminator\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\discriminator\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\discriminator\types.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\discriminator\types.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\draft2020.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\draft2020.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\draft7.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\draft7.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\dynamicAnchor.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\dynamicAnchor.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\dynamicRef.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\dynamicRef.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\recursiveAnchor.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\recursiveAnchor.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\recursiveRef.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\dynamic\recursiveRef.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\errors.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\errors.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\format\format.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\format\format.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\format\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\format\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\discriminator.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\discriminator.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\elements.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\elements.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\enum.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\enum.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\error.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\error.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\metadata.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\metadata.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\nullable.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\nullable.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\optionalProperties.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\optionalProperties.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\properties.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\properties.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\ref.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\ref.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\type.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\type.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\union.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\union.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\values.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\jtd\values.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\metadata.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\metadata.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\next.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\next.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\unevaluated\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\unevaluated\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\unevaluated\unevaluatedItems.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\unevaluated\unevaluatedItems.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\unevaluated\unevaluatedProperties.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\unevaluated\unevaluatedProperties.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\const.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\const.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\dependentRequired.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\dependentRequired.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\enum.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\enum.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitContains.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitContains.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitItems.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitItems.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitLength.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitLength.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitNumber.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitNumber.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitProperties.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\limitProperties.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\multipleOf.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\multipleOf.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\pattern.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\pattern.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\required.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\required.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\uniqueItems.js"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\dist\vocabularies\validation\uniqueItems.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\LICENSE"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\LICENSE"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\ajv\package.json"
ClearErrors
Delete "$INSTDIR\node_modules\ajv\package.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-deep-equal\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\fast-deep-equal\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-deep-equal\LICENSE"
ClearErrors
Delete "$INSTDIR\node_modules\fast-deep-equal\LICENSE"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-deep-equal\package.json"
ClearErrors
Delete "$INSTDIR\node_modules\fast-deep-equal\package.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-uri\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\fast-uri\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-uri\lib\schemes.js"
ClearErrors
Delete "$INSTDIR\node_modules\fast-uri\lib\schemes.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-uri\lib\utils.js"
ClearErrors
Delete "$INSTDIR\node_modules\fast-uri\lib\utils.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-uri\LICENSE"
ClearErrors
Delete "$INSTDIR\node_modules\fast-uri\LICENSE"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\fast-uri\package.json"
ClearErrors
Delete "$INSTDIR\node_modules\fast-uri\package.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\json-schema-traverse\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\json-schema-traverse\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\json-schema-traverse\LICENSE"
ClearErrors
Delete "$INSTDIR\node_modules\json-schema-traverse\LICENSE"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\json-schema-traverse\package.json"
ClearErrors
Delete "$INSTDIR\node_modules\json-schema-traverse\package.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\require-from-string\index.js"
ClearErrors
Delete "$INSTDIR\node_modules\require-from-string\index.js"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\require-from-string\license"
ClearErrors
Delete "$INSTDIR\node_modules\require-from-string\license"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\node_modules\require-from-string\package.json"
ClearErrors
Delete "$INSTDIR\node_modules\require-from-string\package.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\overview.cmd"
ClearErrors
Delete "$INSTDIR\overview.cmd"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\package.json"
ClearErrors
Delete "$INSTDIR\package.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\PAYLOAD-MANIFEST.json"
ClearErrors
Delete "$INSTDIR\PAYLOAD-MANIFEST.json"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\README.md"
ClearErrors
Delete "$INSTDIR\README.md"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\runtime\node.exe"
ClearErrors
Delete "$INSTDIR\runtime\node.exe"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\alias.mjs"
ClearErrors
Delete "$INSTDIR\scripts\alias.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\canary.mjs"
ClearErrors
Delete "$INSTDIR\scripts\canary.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\cleanup.mjs"
ClearErrors
Delete "$INSTDIR\scripts\cleanup.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\cli.mjs"
ClearErrors
Delete "$INSTDIR\scripts\cli.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\connection-filter.mjs"
ClearErrors
Delete "$INSTDIR\scripts\connection-filter.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\dead-recovery.mjs"
ClearErrors
Delete "$INSTDIR\scripts\dead-recovery.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\deployment.mjs"
ClearErrors
Delete "$INSTDIR\scripts\deployment.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\dom.mjs"
ClearErrors
Delete "$INSTDIR\scripts\dom.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\exit-contract.mjs"
ClearErrors
Delete "$INSTDIR\scripts\exit-contract.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\fixture.mjs"
ClearErrors
Delete "$INSTDIR\scripts\fixture.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\input.mjs"
ClearErrors
Delete "$INSTDIR\scripts\input.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\mcp.mjs"
ClearErrors
Delete "$INSTDIR\scripts\mcp.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\native.mjs"
ClearErrors
Delete "$INSTDIR\scripts\native.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\observe-browser-exit.ps1"
ClearErrors
Delete "$INSTDIR\scripts\observe-browser-exit.ps1"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\observer-policy.psm1"
ClearErrors
Delete "$INSTDIR\scripts\observer-policy.psm1"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\output.mjs"
ClearErrors
Delete "$INSTDIR\scripts\output.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\prepare-state.ps1"
ClearErrors
Delete "$INSTDIR\scripts\prepare-state.ps1"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\public-client.mjs"
ClearErrors
Delete "$INSTDIR\scripts\public-client.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\recover-dead-state.ps1"
ClearErrors
Delete "$INSTDIR\scripts\recover-dead-state.ps1"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\render-probe.mjs"
ClearErrors
Delete "$INSTDIR\scripts\render-probe.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\scope.mjs"
ClearErrors
Delete "$INSTDIR\scripts\scope.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\server.mjs"
ClearErrors
Delete "$INSTDIR\scripts\server.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\session.mjs"
ClearErrors
Delete "$INSTDIR\scripts\session.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\start-owner.ps1"
ClearErrors
Delete "$INSTDIR\scripts\start-owner.ps1"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\startup-resources.mjs"
ClearErrors
Delete "$INSTDIR\scripts\startup-resources.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\tools.mjs"
ClearErrors
Delete "$INSTDIR\scripts\tools.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
${If} ${FileExists} "$INSTDIR\scripts\wire.mjs"
ClearErrors
Delete "$INSTDIR\scripts\wire.mjs"
${If} ${Errors}
 MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK
 SetErrorLevel 5
 Abort
${EndIf}
${EndIf}
