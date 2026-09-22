-keepnames class com.example.api.PayrollDto
-if class com.example.api.PayrollDto
-keep class com.example.api.PayrollDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
