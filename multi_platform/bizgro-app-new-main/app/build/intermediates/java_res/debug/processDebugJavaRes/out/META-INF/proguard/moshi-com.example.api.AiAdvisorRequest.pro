-keepnames class com.example.api.AiAdvisorRequest
-if class com.example.api.AiAdvisorRequest
-keep class com.example.api.AiAdvisorRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
