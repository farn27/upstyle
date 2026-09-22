-keepnames class com.example.api.Candidate
-if class com.example.api.Candidate
-keep class com.example.api.CandidateJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
