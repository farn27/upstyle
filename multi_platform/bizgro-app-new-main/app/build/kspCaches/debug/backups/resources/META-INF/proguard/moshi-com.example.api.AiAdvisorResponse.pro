-keepnames class com.example.api.AiAdvisorResponse
-if class com.example.api.AiAdvisorResponse
-keep class com.example.api.AiAdvisorResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
