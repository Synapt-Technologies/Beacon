```
Source / Graph
    ↓  parse          → ParseResult<RawProgram>
RawProgram
    ↓  analyse        → AnalysisResult<CoreProgram>
CoreProgram
    ↓  interpretProgram  (calls interp per dirty node)
Value Map
```