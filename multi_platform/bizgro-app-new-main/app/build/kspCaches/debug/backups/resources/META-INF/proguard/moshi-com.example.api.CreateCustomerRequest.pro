-keepnames class com.example.api.CreateCustomerRequest
-if class com.example.api.CreateCustomerRequest
-keep class com.example.api.CreateCustomerRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.CreateCustomerRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.CreateCustomerRequest {
    public synthetic <init>(java.lang.String,com.example.api.PosCustomerDto,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
