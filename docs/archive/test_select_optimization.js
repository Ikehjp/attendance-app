const AuthService = require('./services/AuthService');
const UserService = require('./services/UserService');
const StudentService = require('./services/StudentService');
const GroupService = require('./services/GroupService');
const { query } = require('./config/database');

async function test() {
    console.log('--- SELECT * 最適化テスト開始 ---');

    try {
        // 1. ユーザー一覧取得テスト (UserService)
        console.log('\n1. UserService.getAllUsers テスト');
        const usersResult = await UserService.getAllUsers();
        if (usersResult.success && usersResult.data.users.length > 0) {
            const user = usersResult.data.users[0];
            console.log('取得ユーザー:', user);
            if (user.password) {
                console.error('❌ 失敗: パスワードが含まれています');
            } else {
                console.log('✅ 成功: パスワードは含まれていません');
            }

            // 2. 特定ユーザー取得テスト (UserService)
            console.log('\n2. UserService.getUser テスト');
            const userResult = await UserService.getUser(user.id);
            if (userResult.success) {
                console.log('取得ユーザー詳細:', userResult.data.user);
                if (userResult.data.user.password) {
                    console.error('❌ 失敗: パスワードが含まれています');
                } else {
                    console.log('✅ 成功: パスワードは含まれていません');
                }
            }
        } else {
            console.log('⚠️ ユーザーが存在しないため、一部のテストをスキップします');
        }

        // 3. 学生一覧取得テスト (StudentService)
        console.log('\n3. StudentService.getStudents テスト');
        const studentsResult = await StudentService.getStudents({ limit: 1 });
        if (studentsResult.success) {
            console.log('学生一覧取得成功');
            if (studentsResult.data.students.length > 0) {
                console.log('取得学生:', studentsResult.data.students[0]);
            }
        } else {
            console.error('❌ 失敗: 学生一覧取得エラー');
        }

        /*
        // 4. グループ一覧取得テスト (GroupService)
        console.log('\n4. GroupService.getGroups テスト');
        const groupsResult = await GroupService.getGroups({ limit: 1 });
        if (groupsResult.success) {
          console.log('グループ一覧取得成功');
          if (groupsResult.data.groups.length > 0) {
            console.log('取得グループ:', groupsResult.data.groups[0]);
          }
        } else {
          console.error('❌ 失敗: グループ一覧取得エラー');
        }
        */

    } catch (error) {
        console.error('テスト実行中にエラーが発生しました:', error);
        if (error.sql) console.error('SQL:', error.sql);
        if (error.sqlMessage) console.error('SQL Message:', error.sqlMessage);
    } finally {
        console.log('\n--- テスト終了 ---');
        process.exit(0);
    }
}

test();
