-keepnames class com.example.api.GetFinanceResponse
-if class com.example.api.GetFinanceResponse
-keep class com.example.api.GetFinanceResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
