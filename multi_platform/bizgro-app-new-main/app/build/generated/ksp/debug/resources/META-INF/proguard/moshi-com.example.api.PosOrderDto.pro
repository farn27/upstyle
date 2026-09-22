-keepnames class com.example.api.PosOrderDto
-if class com.example.api.PosOrderDto
-keep class com.example.api.PosOrderDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.PosOrderDto
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.PosOrderDto {
    public synthetic <init>(java.lang.String,java.lang.String,int,java.lang.Integer,double,double,java.lang.String,java.lang.String,long,java.util.List,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
