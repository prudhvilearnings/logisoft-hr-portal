import pymysql

try:
    conn = pymysql.connect(
        host="localhost",
        user="root",
        password="@6145",
        port=3306
    )
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS logisoft_hr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    print("SUCCESS: Database 'logisoft_hr' created or verified successfully!")
    conn.close()
except Exception as e:
    print("ERROR creating database:", str(e))
