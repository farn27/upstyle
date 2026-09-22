-keepnames class com.example.api.CreateTransactionRequest
-if class com.example.api.CreateTransactionRequest
-keep class com.example.api.CreateTransactionRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
