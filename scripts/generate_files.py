import os

files_c1 = {
    'Bai1_PrintMessages.kt': '''// Bài 1: In thông báo ra màn hình (Print messages)
fun main() {
    println("Use the val keyword when the value doesn't change.")
    println("Use the var keyword when the value can change.")
    println("When you define a function, you define the parameters that can be passed to it.")
    println("When you call a function, you pass arguments for the parameters.")
}
''',
    'Bai2_FixCompileError.kt': '''// Bài 2: Sửa lỗi biên dịch chuỗi (Fix compile error)
fun main() { 
    println("New chat message from a friend")
}
''',
    'Bai3_StringTemplates.kt': '''// Bài 3: Khai báo biến và chèn chuỗi (String templates)
fun main() {
    val discountPercentage = 20
    val item = "Google Chromecast"
    val offer = "Sale - Up to $discountPercentage% discount on $item! Hurry up!"
    
    println(offer)
}
''',
    'Bai4_StringConcatenation.kt': '''// Bài 4: Phép cộng số học thay vì nối chuỗi (String concatenation)
fun main() {
    val numberOfAdults = 20
    val numberOfKids = 30
    val total = numberOfAdults + numberOfKids
    println("The total party size is: $total")
}
''',
    'Bai5_MessageFormatting.kt': '''// Bài 5: Tính tổng lương và định dạng thông điệp (Message formatting)
fun main() {
    val baseSalary = 5000
    val bonusAmount = 1000
    val totalSalary = baseSalary + bonusAmount
    println("Congratulations for your bonus! You will receive a total of $totalSalary (additional bonus).")
}
''',
    'Bai6_BasicMathOperations.kt': '''// Bài 6: Các phép toán cơ bản và định nghĩa hàm (Implement basic math operations)
fun main() {
    val firstNumber = 10
    val secondNumber = 5
    val thirdNumber = 8
    
    val result = add(firstNumber, secondNumber)
    val anotherResult = subtract(firstNumber, thirdNumber)

    println("$firstNumber + $secondNumber = $result")
    println("$firstNumber - $thirdNumber = $anotherResult")
}

fun add(firstNumber: Int, secondNumber: Int): Int {
    return firstNumber + secondNumber
}

fun subtract(firstNumber: Int, secondNumber: Int): Int {
    return firstNumber - secondNumber
}
''',
    'Bai7_DefaultParameters.kt': '''// Bài 7: Tham số mặc định trong hàm (Default parameters)
fun main() {
    val firstUserEmailId = "user_one@gmail.com"
    println(displayAlertMessage(emailId = firstUserEmailId))
    println()

    val secondUserOperatingSystem = "Windows"
    val secondUserEmailId = "user_two@gmail.com"
    println(displayAlertMessage(secondUserOperatingSystem, secondUserEmailId))
    println()

    val thirdUserOperatingSystem = "Mac OS"
    val thirdUserEmailId = "user_three@gmail.com"
    println(displayAlertMessage(thirdUserOperatingSystem, thirdUserEmailId))
    println()
}

fun displayAlertMessage(
    operatingSystem: String = "Unknown OS",
    emailId: String
): String {
    return "There's a new sign-in request on $operatingSystem for your Google Account $emailId."
}
''',
    'Bai8_Pedometer.kt': '''// Bài 8: Chuẩn hóa quy ước đặt tên (Pedometer - Naming conventions)
fun main() {
    val steps = 4000
    val caloriesBurned = pedometerStepsToCalories(steps)
    println("Walking $steps steps burns $caloriesBurned calories") 
}

fun pedometerStepsToCalories(numberOfSteps: Int): Double {
    val caloriesBurnedForEachStep = 0.04
    val totalCaloriesBurned = numberOfSteps * caloriesBurnedForEachStep
    return totalCaloriesBurned
}
''',
    'Bai9_CompareTwoNumbers.kt': '''// Bài 9: So sánh hai số (Compare two numbers)
fun main() {
    println("Have I spent more time using my phone today: ${compareTime(300, 250)}")
    println("Have I spent more time using my phone today: ${compareTime(300, 300)}")
    println("Have I spent more time using my phone today: ${compareTime(200, 220)}")
}

fun compareTime(timeSpentToday: Int, timeSpentYesterday: Int): Boolean {
    return timeSpentToday > timeSpentYesterday
}
''',
    'Bai10_DuplicateCode.kt': '''// Bài 10: Tái cấu trúc mã lặp lại thành hàm (Move duplicate code into a function)
fun main() {
    printWeatherForCity("Ankara", 27, 31, 82)
    printWeatherForCity("Tokyo", 32, 36, 10)
    printWeatherForCity("Cape Town", 59, 64, 2)
    printWeatherForCity("Guatemala City", 50, 55, 7)
}

fun printWeatherForCity(cityName: String, lowTemp: Int, highTemp: Int, chanceOfRain: Int) {
    println("City: $cityName")
    println("Low temperature: $lowTemp, High temperature: $highTemp")
    println("Chance of rain: $chanceOfRain%")
    println()
}
'''
}

files_c2 = {
    'Bai1_MobileNotifications.kt': '''// Bài 1: Tóm tắt thông báo điện thoại (Mobile notifications)
fun main() {
    val morningNotification = 51
    val eveningNotification = 135
    
    printNotificationSummary(morningNotification)
    printNotificationSummary(eveningNotification)
}

fun printNotificationSummary(numberOfMessages: Int) {
    if (numberOfMessages < 100) {
        println("You have $numberOfMessages notifications.")
    } else {
        println("Your phone is blowing up! You have 99+ notifications.")
    }
}
''',
    'Bai2_MovieTicketPrice.kt': '''// Bài 2: Tính giá vé xem phim (Movie-ticket price)
fun main() {
    val child = 5
    val adult = 28
    val senior = 87
    
    val isMonday = true
    
    println("The movie ticket price for a person aged $child is \\$${ticketPrice(child, isMonday)}.")
    println("The movie ticket price for a person aged $adult is \\$${ticketPrice(adult, isMonday)}.")
    println("The movie ticket price for a person aged $senior is \\$${ticketPrice(senior, isMonday)}.")
}
 
fun ticketPrice(age: Int, isMonday: Boolean): Int {
    return when(age) {
        in 0..12 -> 15
        in 13..60 -> if (isMonday) 25 else 30
        in 61..100 -> 20
        else -> -1
    }
}
''',
    'Bai3_TemperatureConverter.kt': '''// Bài 3: Chuyển đổi nhiệt độ với hàm bậc cao và Lambda (Temperature converter)
fun main() {    
    printFinalTemperature(27.0, "Celsius", "Fahrenheit") { 9.0 / 5.0 * it + 32 }
    printFinalTemperature(350.0, "Kelvin", "Celsius") { it - 273.15 }
    printFinalTemperature(10.0, "Fahrenheit", "Kelvin") { 5.0 / 9.0 * (it - 32) + 273.15 }
}

fun printFinalTemperature(
    initialMeasurement: Double, 
    initialUnit: String, 
    finalUnit: String, 
    conversionFormula: (Double) -> Double
) {
    val finalMeasurement = String.format("%.2f", conversionFormula(initialMeasurement))
    println("$initialMeasurement degrees $initialUnit is $finalMeasurement degrees $finalUnit.")
}
''',
    'Bai4_SongCatalog.kt': '''// Bài 4: Quản lý bài hát với Class và Custom Getter (Song catalog)
fun main() {    
    val brunoSong = Song("We Don't Talk About Bruno", "Encanto Cast", 2022, 1_000_000)
    brunoSong.printDescription()
    println(brunoSong.isPopular)
}

class Song(
    val title: String, 
    val artist: String, 
    val yearPublished: Int, 
    val playCount: Int
) {
    val isPopular: Boolean
        get() = playCount >= 1000

    fun printDescription() {
        println("$title, performed by $artist, was released in $yearPublished.")
    }   
}
''',
    'Bai5_InternetProfile.kt': '''// Bài 5: Hồ sơ người dùng và xử lý Nullable (Internet profile)
fun main() {    
    val amanda = Person("Amanda", 33, "play tennis", null)
    val atiqah = Person("Atiqah", 28, "climb", amanda)
    
    amanda.showProfile()
    atiqah.showProfile()
}

class Person(val name: String, val age: Int, val hobby: String?, val referrer: Person?) {
    fun showProfile() {
        println("Name: $name")
        println("Age: $age")
        if (hobby != null) {
            print("Likes to $hobby. ")
        }
        if (referrer != null) {
            print("Has a referrer named ${referrer.name}")
            if (referrer.hobby != null) {
                print(", who likes to ${referrer.hobby}.")
            } else {
                print(".")
            }
        } else {
            print("Doesn't have a referrer.")
        }
        print("\\n\\n")
    }
}
''',
    'Bai6_FoldablePhones.kt': '''// Bài 6: Kế thừa và ghi đè phương thức (Foldable phones)
open class Phone(var isScreenLightOn: Boolean = false) {
    open fun switchOn() {
        isScreenLightOn = true
    }
    
    fun switchOff() {
        isScreenLightOn = false
    }
    
    fun checkPhoneScreenLight() {
        val phoneScreenLight = if (isScreenLightOn) "on" else "off"
        println("The phone screen's light is $phoneScreenLight.")
    }
}

class FoldablePhone(var isFolded: Boolean = true) : Phone() {
    override fun switchOn() {
        if (!isFolded) {
            isScreenLightOn = true
        }
    }
    
    fun fold() {
        isFolded = true
    }
    
    fun unfold() {
        isFolded = false
    }
}

fun main() {    
    val newFoldablePhone = FoldablePhone()
    
    newFoldablePhone.switchOn()
    newFoldablePhone.checkPhoneScreenLight()
    newFoldablePhone.unfold()
    newFoldablePhone.switchOn()
    newFoldablePhone.checkPhoneScreenLight()
}
''',
    'Bai7_SpecialAuction.kt': '''// Bài 7: Đấu giá và toán tử Elvis ?: (Special auction)
fun main() {
    val winningBid = Bid(5000, "Private Collector")
    
    println("Item A is sold at ${auctionPrice(winningBid, 2000)}.")
    println("Item B is sold at ${auctionPrice(null, 3000)}.")
}

class Bid(val amount: Int, val bidder: String)

fun auctionPrice(bid: Bid?, minimumPrice: Int): Int {
    return bid?.amount ?: minimumPrice
}
'''
}

os.makedirs('src/codelab1', exist_ok=True)
os.makedirs('src/codelab2', exist_ok=True)

for fname, content in files_c1.items():
    with open(os.path.join('src/codelab1', fname), 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

for fname, content in files_c2.items():
    with open(os.path.join('src/codelab2', fname), 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

print('Successfully created all Kotlin source files!')
