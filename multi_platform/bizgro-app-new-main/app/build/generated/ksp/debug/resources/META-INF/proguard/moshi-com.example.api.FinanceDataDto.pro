-keepnames class com.example.api.FinanceDataDto
-if class com.example.api.FinanceDataDto
-keep class com.example.api.FinanceDataDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
